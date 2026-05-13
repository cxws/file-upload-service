
package com.example.fileupload.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 文件列表响应DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileListResponse {

    /**
     * 文件列表
     */
    private List<FileInfoDTO> files;

    /**
     * 总记录数
     */
    private Long total;

    /**
     * 当前页码
     */
    private Integer page;

    /**
     * 每页大小
     */
    private Integer size;

    /**
     * 总页数
     */
    private Integer totalPages;
}
