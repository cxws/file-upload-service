
package com.example.fileupload.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 上传文件实体
 */
@Entity
@Table(name = "upload_files")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * 原始文件名
     */
    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    /**
     * 存储文件名
     */
    @Column(name = "stored_file_name", nullable = false)
    private String storedFileName;

    /**
     * 文件大小（字节）
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * 文件类型
     */
    @Column(name = "content_type")
    private String contentType;

    /**
     * 文件存储路径
     */
    @Column(name = "file_path", nullable = false)
    private String filePath;

    /**
     * 文件描述
     */
    @Column(name = "description")
    private String description;

    /**
     * 上传状态：PENDING, UPLOADING, COMPLETED, FAILED, CANCELLED
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING";

    /**
     * 上传进度（0-100）
     */
    @Column(name = "progress")
    @Builder.Default
    private Integer progress = 0;

    /**
     * 错误信息
     */
    @Column(name = "error_message")
    private String errorMessage;

    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
