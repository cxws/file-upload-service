
package com.example.fileupload.repository;

import com.example.fileupload.entity.UploadFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 上传文件Repository
 */
@Repository
public interface UploadFileRepository extends JpaRepository<UploadFile, String> {

    /**
     * 根据状态查询文件列表
     */
    List<UploadFile> findByStatus(String status);

    /**
     * 根据状态查询文件列表（分页）
     */
    Page<UploadFile> findByStatus(String status, Pageable pageable);

    /**
     * 根据文件名模糊搜索
     */
    Page<UploadFile> findByOriginalFileNameContainingIgnoreCase(String fileName, Pageable pageable);

    /**
     * 根据状态和文件名模糊搜索
     */
    Page<UploadFile> findByStatusAndOriginalFileNameContainingIgnoreCase(String status, String fileName, Pageable pageable);

    /**
     * 查询上传中和待上传的文件
     */
    List<UploadFile> findByStatusIn(List<String> statuses);

    /**
     * 检查文件是否存在
     */
    boolean existsByStoredFileName(String storedFileName);

    /**
     * 根据存储文件名查找
     */
    Optional<UploadFile> findByStoredFileName(String storedFileName);
}
