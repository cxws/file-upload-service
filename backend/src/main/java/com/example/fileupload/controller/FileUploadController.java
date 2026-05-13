package com.example.fileupload.controller;

import com.example.fileupload.common.ApiResponse;
import com.example.fileupload.dto.response.FileInfoDTO;
import com.example.fileupload.dto.response.FileListResponse;
import com.example.fileupload.dto.response.UploadStatusDTO;
import com.example.fileupload.service.FileUploadService;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 文件上传控制器
 * 提供通用的文件上传、查询、状态查询和取消等API
 */
@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    /**
     * 上传单个文件
     *
     * @param file        文件
     * @param targetPath  目标路径（可选）
     * @param description 文件描述（可选）
     * @param overwrite   是否覆盖（可选，默认false）
     * @return 文件信息
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileInfoDTO>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "targetPath", required = false) String targetPath,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "overwrite", required = false, defaultValue = "false") Boolean overwrite) {

        log.info("收到文件上传请求：{}", file.getOriginalFilename());

        try {
            FileInfoDTO result = fileUploadService.uploadFile(file, targetPath, description, overwrite);
            return ResponseEntity.ok(ApiResponse.success("文件上传成功", result));
        } catch (Exception e) {
            log.error("文件上传失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("文件上传失败：" + e.getMessage()));
        }
    }

    /**
     * 批量上传文件
     *
     * @param files       文件数组
     * @param targetPath  目标路径（可选）
     * @param description 文件描述（可选）
     * @param overwrite   是否覆盖（可选，默认false）
     * @return 文件信息列表
     */
    @PostMapping(value = "/upload/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<List<FileInfoDTO>>> uploadFiles(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "targetPath", required = false) String targetPath,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "overwrite", required = false, defaultValue = "false") Boolean overwrite) {

        log.info("收到批量文件上传请求，文件数量：{}", files.length);

        try {
            List<FileInfoDTO> results = fileUploadService.uploadFiles(files, targetPath, description, overwrite);
            long successCount = results.stream().filter(f -> "COMPLETED".equals(f.getStatus())).count();
            return ResponseEntity.ok(ApiResponse.success(
                    String.format("批量上传完成，成功：%d，失败：%d", successCount, results.size() - successCount),
                    results));
        } catch (Exception e) {
            log.error("批量文件上传失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("批量上传失败：" + e.getMessage()));
        }
    }

    /**
     * 查询文件列表
     *
     * @param page          页码（默认1）
     * @param size          每页大小（默认20）
     * @param status        状态筛选（可选：ALL, PENDING, UPLOADING, COMPLETED, FAILED, CANCELLED）
     * @param fileName      文件名模糊搜索（可选）
     * @param sortBy        排序字段（可选：createdAt, fileSize, originalFileName，默认createdAt）
     * @param sortDirection 排序方向（可选：ASC, DESC，默认DESC）
     * @return 文件列表
     */
    @GetMapping("/list")
    public ResponseEntity<ApiResponse<FileListResponse>> getFileList(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "20") Integer size,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "fileName", required = false) String fileName,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "sortDirection", defaultValue = "DESC") String sortDirection) {

        log.info("查询文件列表：page={}, size={}, status={}, fileName={}, sortBy={}, sortDirection={}", page, size, status, fileName, sortBy, sortDirection);

        try {
            FileListResponse result = fileUploadService.getFileList(page, size, status, fileName, sortBy, sortDirection);
            return ResponseEntity.ok(ApiResponse.success("查询成功", result));
        } catch (Exception e) {
            log.error("查询文件列表失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("查询失败：" + e.getMessage()));
        }
    }

    /**
     * 获取文件详情
     *
     * @param fileId 文件ID
     * @return 文件信息
     */
    @GetMapping("/{fileId}")
    public ResponseEntity<ApiResponse<FileInfoDTO>> getFileInfo(@PathVariable String fileId) {

        log.info("查询文件详情：{}", fileId);

        try {
            FileInfoDTO result = fileUploadService.getFileInfo(fileId);
            return ResponseEntity.ok(ApiResponse.success("查询成功", result));
        } catch (IllegalArgumentException e) {
            log.warn("文件不存在：{}", fileId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("查询文件详情失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("查询失败：" + e.getMessage()));
        }
    }

    /**
     * 获取上传状态
     *
     * @param fileId 文件ID
     * @return 上传状态
     */
    @GetMapping("/{fileId}/status")
    public ResponseEntity<ApiResponse<UploadStatusDTO>> getUploadStatus(@PathVariable String fileId) {

        log.info("查询上传状态：{}", fileId);

        try {
            UploadStatusDTO result = fileUploadService.getUploadStatus(fileId);
            return ResponseEntity.ok(ApiResponse.success("查询成功", result));
        } catch (IllegalArgumentException e) {
            log.warn("文件不存在：{}", fileId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("查询上传状态失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("查询失败：" + e.getMessage()));
        }
    }

    /**
     * 批量获取上传状态
     *
     * @param fileIds 文件ID列表
     * @return 上传状态列表
     */
    @PostMapping("/status/batch")
    public ResponseEntity<ApiResponse<List<UploadStatusDTO>>> getUploadStatuses(
            @RequestBody @NotEmpty List<String> fileIds) {

        log.info("批量查询上传状态，文件数量：{}", fileIds.size());

        try {
            List<UploadStatusDTO> results = fileUploadService.getUploadStatuses(fileIds);
            return ResponseEntity.ok(ApiResponse.success("查询成功", results));
        } catch (Exception e) {
            log.error("批量查询上传状态失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("查询失败：" + e.getMessage()));
        }
    }

    /**
     * 取消上传
     *
     * @param fileId 文件ID
     * @return 是否取消成功
     */
    @PostMapping("/{fileId}/cancel")
    public ResponseEntity<ApiResponse<Boolean>> cancelUpload(@PathVariable String fileId) {

        log.info("取消文件上传：{}", fileId);

        try {
            boolean result = fileUploadService.cancelUpload(fileId);
            if (result) {
                return ResponseEntity.ok(ApiResponse.success("取消成功", true));
            } else {
                return ResponseEntity.ok(ApiResponse.success("文件不支持取消或不存在", false));
            }
        } catch (Exception e) {
            log.error("取消上传失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("取消失败：" + e.getMessage()));
        }
    }

    /**
     * 删除文件
     *
     * @param fileId 文件ID
     * @return 是否删除成功
     */
    @DeleteMapping("/{fileId}")
    public ResponseEntity<ApiResponse<Boolean>> deleteFile(@PathVariable String fileId) {

        log.info("删除文件：{}", fileId);

        try {
            boolean result = fileUploadService.deleteFile(fileId);
            if (result) {
                return ResponseEntity.ok(ApiResponse.success("删除成功", true));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除文件失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("删除失败：" + e.getMessage()));
        }
    }

    /**
     * 批量删除文件
     *
     * @param fileIds 文件ID列表
     * @return 删除成功的数量
     */
    @DeleteMapping("/batch")
    public ResponseEntity<ApiResponse<Integer>> deleteFiles(@RequestBody @NotEmpty List<String> fileIds) {

        log.info("批量删除文件，文件数量：{}", fileIds.size());

        try {
            int result = fileUploadService.deleteFiles(fileIds);
            return ResponseEntity.ok(ApiResponse.success(
                    String.format("删除完成，成功删除：%d 个文件", result),
                    result));
        } catch (Exception e) {
            log.error("批量删除文件失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("删除失败：" + e.getMessage()));
        }
    }

    /**
     * 重试上传失败的文件
     *
     * @param fileId 文件ID
     * @return 文件信息
     */
    @PostMapping("/{fileId}/retry")
    public ResponseEntity<ApiResponse<FileInfoDTO>> retryUpload(@PathVariable String fileId) {

        log.info("重试文件上传：{}", fileId);

        try {
            FileInfoDTO result = fileUploadService.retryUpload(fileId);
            return ResponseEntity.ok(ApiResponse.success("已重置状态，可重新上传", result));
        } catch (IllegalArgumentException e) {
            log.warn("重试上传失败：{}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("重试上传失败：{}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.error("重试失败：" + e.getMessage()));
        }
    }
}