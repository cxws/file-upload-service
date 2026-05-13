
package com.example.fileupload.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 文件信息DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileInfoDTO {

    /**
     * 文件ID
     */
    private String id;

    /**
     * 原始文件名
     */
    private String originalFileName;

    /**
     * 存储文件名
     */
    private String storedFileName;

    /**
     * 文件大小（字节）
     */
    private Long fileSize;

    /**
     * 文件类型
     */
    private String contentType;

    /**
     * 文件路径
     */
    private String filePath;

    /**
     * 文件描述
     */
    private String description;

    /**
     * 上传状态：PENDING, UPLOADING, COMPLETED, FAILED, CANCELLED
     */
    private String status;

    /**
     * 上传进度（0-100）
     */
    private Integer progress;

    /**
     * 上传时间
     */
    private LocalDateTime uploadTime;

    /**
     * 错误信息
     */
    private String errorMessage;
}
