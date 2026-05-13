
package com.example.fileupload.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 文件列表查询请求DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileListQueryRequest {

    /**
     * 页码（从1开始）
     */
    @Builder.Default
    private Integer page = 1;

    /**
     * 每页大小
     */
    @Builder.Default
    private Integer size = 20;

    /**
     * 文件状态筛选：ALL, PENDING, UPLOADING, COMPLETED, FAILED, CANCELLED
     */
    private String status;

    /**
     * 文件名模糊搜索
     */
    private String fileName;

    /**
     * 排序字段：uploadTime, fileSize, fileName
     */
    @Builder.Default
    private String sortBy = "uploadTime";

    /**
     * 排序方向：ASC, DESC
     */
    @Builder.Default
    private String sortDirection = "DESC";
}
