
package com.example.fileupload.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 文件上传请求DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadRequest {

    /**
     * 目标存储路径
     */
    private String targetPath;

    /**
     * 文件描述
     */
    private String description;

    /**
     * 是否覆盖同名文件
     */
    private Boolean overwrite = false;
}
