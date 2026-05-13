
package com.example.fileupload.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 上传状态DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadStatusDTO {

    /**
     * 文件ID
     */
    private String fileId;

    /**
     * 原始文件名
     */
    private String fileName;

    /**
     * 上传状态：PENDING, UPLOADING, COMPLETED, FAILED, CANCELLED
     */
    private String status;

    /**
     * 上传进度（0-100）
     */
    private Integer progress;

    /**
     * 已上传大小（字节）
     */
    private Long uploadedBytes;

    /**
     * 文件总大小（字节）
     */
    private Long totalBytes;

    /**
     * 错误信息
     */
    private String errorMessage;
}
