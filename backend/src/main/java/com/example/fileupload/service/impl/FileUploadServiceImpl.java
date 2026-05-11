package com.example.fileupload.service.impl;

import com.example.fileupload.dto.response.FileInfoDTO;
import com.example.fileupload.dto.response.FileListResponse;
import com.example.fileupload.dto.response.UploadStatusDTO;
import com.example.fileupload.entity.UploadFile;
import com.example.fileupload.repository.UploadFileRepository;
import com.example.fileupload.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 文件上传服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadServiceImpl implements FileUploadService {

    private final UploadFileRepository uploadFileRepository;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    @Transactional
    public FileInfoDTO uploadFile(MultipartFile file, String targetPath, String description, Boolean overwrite) {
        // 验证文件
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }

        // 获取原始文件名
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

        // 生成存储文件名
        String storedFileName = generateStoredFileName(originalFileName);

        // 构建完整存储路径
        Path storagePath = buildStoragePath(targetPath, storedFileName);

        // 检查文件是否已存在
        if (Files.exists(storagePath) && !Boolean.TRUE.equals(overwrite)) {
            throw new IllegalArgumentException("文件已存在：" + originalFileName);
        }

        UploadFile uploadFile = null;

        try {
            // 创建文件记录（状态为上传中）
            uploadFile = UploadFile.builder()
                    .originalFileName(originalFileName)
                    .storedFileName(storedFileName)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .filePath(storagePath.toString())
                    .description(description)
                    .status("UPLOADING")
                    .progress(0)
                    .build();
            uploadFile = uploadFileRepository.save(uploadFile);

            // 确保目录存在
            Files.createDirectories(storagePath.getParent());

            // 流式写入文件，并定期检查取消状态
            long totalBytes = file.getSize();
            long uploadedBytes = 0;
            int progress = 0;
            long lastCheckTime = System.currentTimeMillis();

            try (var inputStream = file.getInputStream();
                 var outputStream = Files.newOutputStream(storagePath)) {
                byte[] buffer = new byte[8192];
                int bytesRead;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    // 检查是否已取消
                    if (isCancelled(uploadFile.getId())) {
                        // 删除已写入的部分文件
                        Files.deleteIfExists(storagePath);
                        uploadFile.setStatus("CANCELLED");
                        uploadFile.setProgress(0);
                        uploadFileRepository.save(uploadFile);
                        log.info("文件上传已取消：{}", originalFileName);
                        throw new RuntimeException("文件上传已取消");
                    }

                    outputStream.write(buffer, 0, bytesRead);
                    uploadedBytes += bytesRead;

                    // 更新进度
                    if (totalBytes > 0) {
                        progress = (int) ((uploadedBytes * 100) / totalBytes);
                        // 每秒最多更新一次数据库
                        if (System.currentTimeMillis() - lastCheckTime > 1000) {
                            uploadFile.setProgress(progress);
                            uploadFileRepository.save(uploadFile);
                            lastCheckTime = System.currentTimeMillis();
                        }
                    }
                }
            }

            // 检查最终是否被取消
            if (isCancelled(uploadFile.getId())) {
                Files.deleteIfExists(storagePath);
                uploadFile.setStatus("CANCELLED");
                uploadFileRepository.save(uploadFile);
                log.info("文件上传已取消（完成后检查）：{}", originalFileName);
                throw new RuntimeException("文件上传已取消");
            }

            // 更新文件状态为完成
            uploadFile.setStatus("COMPLETED");
            uploadFile.setProgress(100);
            uploadFileRepository.save(uploadFile);

            log.info("文件上传成功：{} -> {}", originalFileName, storedFileName);
            return convertToDTO(uploadFile);

        } catch (IOException e) {
            log.error("文件上传失败：{}", originalFileName, e);
            // 更新文件状态为失败
            if (uploadFile != null) {
                uploadFile.setStatus("FAILED");
                uploadFile.setErrorMessage(e.getMessage());
                uploadFileRepository.save(uploadFile);
            }
            throw new RuntimeException("文件上传失败：" + e.getMessage(), e);
        }
    }

    /**
     * 检查文件是否已被取消
     */
    private boolean isCancelled(String fileId) {
        return uploadFileRepository.findById(fileId)
                .map(f -> "CANCELLED".equals(f.getStatus()))
                .orElse(false);
    }

    @Override
    @Transactional
    public List<FileInfoDTO> uploadFiles(MultipartFile[] files, String targetPath, String description, Boolean overwrite) {
        List<FileInfoDTO> results = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                FileInfoDTO dto = uploadFile(file, targetPath, description, overwrite);
                results.add(dto);
            } catch (Exception e) {
                log.error("批量上传文件失败：{}", file.getOriginalFilename(), e);
                // 创建失败记录
                UploadFile failedFile = UploadFile.builder()
                        .originalFileName(StringUtils.cleanPath(file.getOriginalFilename()))
                        .storedFileName(generateStoredFileName(file.getOriginalFilename()))
                        .fileSize(file.getSize())
                        .contentType(file.getContentType())
                        .filePath("")
                        .description(description)
                        .status("FAILED")
                        .progress(0)
                        .errorMessage(e.getMessage())
                        .build();
                uploadFileRepository.save(failedFile);
                results.add(convertToDTO(failedFile));
            }
        }

        return results;
    }

    @Override
    public FileListResponse getFileList(Integer page, Integer size, String status, String fileName,
                                        String sortBy, String sortDirection) {
        // 构建排序
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page - 1, size, sort);

        // 执行查询
        Page<UploadFile> filePage;
        if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
            if (StringUtils.hasText(fileName)) {
                filePage = uploadFileRepository.findByStatusAndOriginalFileNameContainingIgnoreCase(status, fileName, pageable);
            } else {
                filePage = uploadFileRepository.findByStatus(status, pageable);
            }
        } else {
            if (StringUtils.hasText(fileName)) {
                filePage = uploadFileRepository.findByOriginalFileNameContainingIgnoreCase(fileName, pageable);
            } else {
                filePage = uploadFileRepository.findAll(pageable);
            }
        }

        // 转换为DTO
        List<FileInfoDTO> files = filePage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return FileListResponse.builder()
                .files(files)
                .total(filePage.getTotalElements())
                .page(page)
                .size(size)
                .totalPages(filePage.getTotalPages())
                .build();
    }

    @Override
    public FileInfoDTO getFileInfo(String fileId) {
        UploadFile uploadFile = uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("文件不存在：" + fileId));
        return convertToDTO(uploadFile);
    }

    @Override
    public UploadStatusDTO getUploadStatus(String fileId) {
        UploadFile uploadFile = uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("文件不存在：" + fileId));

        return UploadStatusDTO.builder()
                .fileId(uploadFile.getId())
                .fileName(uploadFile.getOriginalFileName())
                .status(uploadFile.getStatus())
                .progress(uploadFile.getProgress())
                .uploadedBytes(uploadFile.getProgress() != null ?
                        (uploadFile.getFileSize() * uploadFile.getProgress()) / 100 : 0)
                .totalBytes(uploadFile.getFileSize())
                .errorMessage(uploadFile.getErrorMessage())
                .build();
    }

    @Override
    public List<UploadStatusDTO> getUploadStatuses(List<String> fileIds) {
        return fileIds.stream()
                .map(this::getUploadStatus)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public boolean cancelUpload(String fileId) {
        UploadFile uploadFile = uploadFileRepository.findById(fileId).orElse(null);
        if (uploadFile == null) {
            return false;
        }

        // 只有上传中和待上传的文件可以取消
        if ("UPLOADING".equals(uploadFile.getStatus()) || "PENDING".equals(uploadFile.getStatus())) {
            uploadFile.setStatus("CANCELLED");
            uploadFile.setProgress(0);
            uploadFileRepository.save(uploadFile);
            log.info("文件上传已取消：{}", fileId);
            return true;
        }

        return false;
    }

    @Override
    @Transactional
    public boolean deleteFile(String fileId) {
        UploadFile uploadFile = uploadFileRepository.findById(fileId).orElse(null);
        if (uploadFile == null) {
            return false;
        }

        // 删除物理文件
        try {
            Path filePath = Paths.get(uploadFile.getFilePath());
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
        } catch (IOException e) {
            log.warn("删除物理文件失败：{}", uploadFile.getFilePath(), e);
        }

        // 删除数据库记录
        uploadFileRepository.delete(uploadFile);
        log.info("文件已删除：{}", fileId);
        return true;
    }

    @Override
    @Transactional
    public int deleteFiles(List<String> fileIds) {
        int count = 0;
        for (String fileId : fileIds) {
            if (deleteFile(fileId)) {
                count++;
            }
        }
        return count;
    }

    @Override
    @Transactional
    public FileInfoDTO retryUpload(String fileId) {
        UploadFile uploadFile = uploadFileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("文件不存在：" + fileId));

        // 只有失败或取消的文件可以重试
        if (!"FAILED".equals(uploadFile.getStatus()) && !"CANCELLED".equals(uploadFile.getStatus())) {
            throw new IllegalArgumentException("只有失败或取消的文件可以重试上传");
        }

        // 重置状态
        uploadFile.setStatus("PENDING");
        uploadFile.setProgress(0);
        uploadFile.setErrorMessage(null);
        uploadFile.setUpdatedAt(LocalDateTime.now());
        uploadFileRepository.save(uploadFile);

        log.info("文件上传已重试：{}", fileId);
        return convertToDTO(uploadFile);
    }

    /**
     * 生成存储文件名
     */
    private String generateStoredFileName(String originalFileName) {
        String extension = StringUtils.getFilenameExtension(originalFileName);
        String baseName = UUID.randomUUID().toString();
        if (extension != null) {
            return baseName + "." + extension;
        }
        return baseName;
    }

    /**
     * 构建存储路径
     */
    private Path buildStoragePath(String targetPath, String storedFileName) {
        Path basePath = Paths.get(uploadDir);
        if (StringUtils.hasText(targetPath)) {
            basePath = basePath.resolve(targetPath);
        }
        return basePath.resolve(storedFileName);
    }

    /**
     * 转换为DTO
     */
    private FileInfoDTO convertToDTO(UploadFile entity) {
        return FileInfoDTO.builder()
                .id(entity.getId())
                .originalFileName(entity.getOriginalFileName())
                .storedFileName(entity.getStoredFileName())
                .fileSize(entity.getFileSize())
                .contentType(entity.getContentType())
                .filePath(entity.getFilePath())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .progress(entity.getProgress())
                .uploadTime(entity.getCreatedAt())
                .errorMessage(entity.getErrorMessage())
                .build();
    }
}
