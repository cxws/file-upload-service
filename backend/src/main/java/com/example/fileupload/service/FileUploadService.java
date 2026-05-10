
package com.example.fileupload.service;

import com.example.fileupload.dto.response.FileInfoDTO;
import com.example.fileupload.dto.response.FileListResponse;
import com.example.fileupload.dto.response.UploadStatusDTO;
import org.springframework.web.multipart.MultipartFile;

/**
 * 文件上传服务接口
 */
public interface FileUploadService {

    /**
     * 上传单个文件
     *
     * @param file        文件
     * @param targetPath  目标路径
     * @param description 文件描述
     * @param overwrite   是否覆盖
     * @return 文件信息
     */
    FileInfoDTO uploadFile(MultipartFile file, String targetPath, String description, Boolean overwrite);

    /**
     * 批量上传文件
     *
     * @param files       文件数组
     * @param targetPath  目标路径
     * @param description 文件描述
     * @param overwrite   是否覆盖
     * @return 文件信息列表
     */
    java.util.List<FileInfoDTO> uploadFiles(MultipartFile[] files, String targetPath, String description, Boolean overwrite);

    /**
     * 获取文件列表
     *
     * @param page          页码
     * @param size          每页大小
     * @param status        状态筛选
     * @param fileName      文件名搜索
     * @param sortBy        排序字段
     * @param sortDirection 排序方向
     * @return 文件列表响应
     */
    FileListResponse getFileList(Integer page, Integer size, String status, String fileName, String sortBy, String sortDirection);

    /**
     * 获取文件详情
     *
     * @param fileId 文件ID
     * @return 文件信息
     */
    FileInfoDTO getFileInfo(String fileId);

    /**
     * 获取上传状态
     *
     * @param fileId 文件ID
     * @return 上传状态
     */
    UploadStatusDTO getUploadStatus(String fileId);

    /**
     * 获取多个文件的上传状态
     *
     * @param fileIds 文件ID列表
     * @return 上传状态列表
     */
    java.util.List<UploadStatusDTO> getUploadStatuses(java.util.List<String> fileIds);

    /**
     * 取消上传
     *
     * @param fileId 文件ID
     * @return 是否取消成功
     */
    boolean cancelUpload(String fileId);

    /**
     * 删除文件
     *
     * @param fileId 文件ID
     * @return 是否删除成功
     */
    boolean deleteFile(String fileId);

    /**
     * 删除多个文件
     *
     * @param fileIds 文件ID列表
     * @return 删除成功的数量
     */
    int deleteFiles(java.util.List<String> fileIds);

    /**
     * 重试上传失败的文件
     *
     * @param fileId 文件ID
     * @return 文件信息
     */
    FileInfoDTO retryUpload(String fileId);
}
