import { useState, useCallback, useRef } from 'react';
import { Upload, Button, Progress, Tag, message, Modal } from 'antd';
import { InboxOutlined, FileOutlined, DeleteOutlined, UploadOutlined, CloseCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { uploadFile } from '../api/fileApi';

/**
 * 高级文件上传组件
 * 支持拖放、多文件上传、自动上传、进度跟踪和验证
 *
 * @param {Object} props
 * @param {boolean} [props.multiple=true] - 是否支持多文件上传
 * @param {string} [props.accept] - 接受的文件类型，如 "image/*", ".pdf,.doc"
 * @param {number} [props.maxFileSize] - 单个文件最大大小（字节）
 * @param {number} [props.maxTotalSize] - 总文件最大大小（字节）
 * @param {number} [props.maxFiles=10] - 最大文件数量
 * @param {boolean} [props.autoUpload=true] - 是否自动上传
 * @param {string} [props.targetPath] - 目标存储路径
 * @param {string} [props.description] - 文件描述
 * @param {boolean} [props.overwrite=false] - 是否覆盖同名文件
 * @param {Function} [props.onUploadStart] - 上传开始回调
 * @param {Function} [props.onUploadProgress] - 上传进度回调
 * @param {Function} [props.onUploadSuccess] - 上传成功回调
 * @param {Function} [props.onUploadError] - 上传失败回调
 * @param {Function} [props.onAllUploadComplete] - 全部上传完成回调
 */
const AdvancedUploader = ({
  multiple = true,
  accept,
  maxFileSize,
  maxTotalSize,
  maxFiles = 10,
  autoUpload = true,
  targetPath,
  description,
  overwrite = false,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  onAllUploadComplete,
}) => {
  const [fileList, setFileList] = useState([]);
  const [uploadingIds, setUploadingIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState(new Map());
  const [dragging, setDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const generateFileId = (file) => `${file.name}-${file.size}-${Date.now()}`;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFiles = useCallback((files) => {
    const errors = [];
    const validFiles = [];

    Array.from(files).forEach((file) => {
      let error = null;

      if (maxFileSize && file.size > maxFileSize) {
        error = `文件 "${file.name}" 大小超出限制（${formatFileSize(maxFileSize)}）`;
      } else if (accept) {
        const acceptTypes = accept.split(',').map(t => t.trim());
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        const isValid = acceptTypes.some(type => {
          if (type.startsWith('.')) {
            return fileName.endsWith(type.toLowerCase());
          } else if (type.endsWith('/*')) {
            const category = type.split('/')[0];
            return fileType.startsWith(category + '/');
          } else {
            return fileType === type;
          }
        });
        if (!isValid) {
          error = `文件 "${file.name}" 类型不支持`;
        }
      }

      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    const currentTotalSize = fileList.reduce((sum, f) => sum + (f.file?.size || 0), 0);
    const newTotalSize = validFiles.reduce((sum, f) => sum + f.size, 0);

    if (maxTotalSize && (currentTotalSize + newTotalSize) > maxTotalSize) {
      errors.push(`总文件大小超出限制（${formatFileSize(maxTotalSize)}）`);
      return { errors, validFiles: [] };
    }

    if (maxFiles && (fileList.length + validFiles.length) > maxFiles) {
      errors.push(`文件数量超出限制（最多 ${maxFiles} 个）`);
      return { errors, validFiles: validFiles.slice(0, maxFiles - fileList.length) };
    }

    return { errors, validFiles };
  }, [accept, maxFileSize, maxTotalSize, maxFiles, fileList]);

  const addFilesToList = useCallback((files) => {
    const { errors, validFiles } = validateFiles(files);

    if (errors.length > 0) {
      setValidationErrors(errors);
      errors.forEach(err => message.error(err));
    }

    if (validFiles.length > 0) {
      const newFiles = validFiles.map(file => ({
        id: generateFileId(file),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
        error: null,
      }));

      setFileList(prev => [...prev, ...newFiles]);

      if (autoUpload) {
        newFiles.forEach(f => uploadSingleFile(f));
      }
    }
  }, [validateFiles, autoUpload]);

  const uploadSingleFile = async (fileItem) => {
    const { id: tempId, file } = fileItem;

    setUploadingIds(prev => new Set([...prev, tempId]));

    try {
      const result = await uploadFile(file, {
        targetPath,
        description,
        overwrite,
        onProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgressMap(prev => new Map(prev).set(tempId, percent));
            setFileList(prev => prev.map(f => f.id === tempId ? { ...f, progress: percent } : f));
            onUploadProgress?.({ fileId: tempId, fileName: file.name, percent, loaded: progressEvent.loaded, total: progressEvent.total });
          },
      });

      // 上传文件到临时目录成功，现在更新任务为真实的文件ID并设置为PENDING状态
      setFileList(prev => prev.map(f => {
        if (f.id === tempId) {
          return { 
            ...f, 
            id: result.id, 
            status: 'pending', 
            progress: 0, 
            result 
          };
        }
        return f;
      }));

      // 通知主组件更新任务列表
      onUploadStart?.({ fileId: result.id, fileName: file.name, fileSize: file.size });
      message.success(`文件已提交处理：${file.name}`);

    } catch (error) {
      const errorMsg = error.message || '上传失败';
      setFileList(prev => prev.map(f => f.id === tempId ? { ...f, status: 'error', error: errorMsg } : f));
      onUploadError?.({ fileId: tempId, fileName: file.name, error: errorMsg });
      message.error(`文件上传失败：${file.name} - ${errorMsg}`);
    } finally {
      setUploadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
      checkAllUploadComplete();
    }
  };

  const checkAllUploadComplete = () => {
    const pendingFiles = fileList.filter(f => f.status === 'pending' || f.status === 'uploading');
    if (pendingFiles.length === 0 && uploadingIds.size === 0) {
      const completedFiles = fileList.filter(f => f.status === 'completed');
      const failedFiles = fileList.filter(f => f.status === 'error');
      onAllUploadComplete?.({ success: completedFiles.length, failed: failedFiles.length, files: fileList });
    }
  };

  const handleRemoveFile = (fileId) => {
    setFileList(prev => prev.filter(f => f.id !== fileId));
    setProgressMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  };

  const handleRetryFile = (fileItem) => {
    uploadSingleFile(fileItem);
  };

  const handleClearCompleted = () => {
    setFileList(prev => prev.filter(f => f.status !== 'completed'));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFilesToList(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      addFilesToList(files);
    }
    e.target.value = '';
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />;
      case 'uploading':
        return <UploadOutlined style={{ color: '#1890ff', fontSize: '20px', animation: 'pulse 1s infinite' }} />;
      default:
        return <FileOutlined style={{ color: '#999', fontSize: '20px' }} />;
    }
  };

  const completedCount = fileList.filter(f => f.status === 'completed').length;
  const errorCount = fileList.filter(f => f.status === 'error').length;
  const uploadingCount = fileList.filter(f => f.status === 'uploading').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          border: `2px dashed ${dragging ? '#1890ff' : '#d9d9d9'}`,
          borderRadius: '8px',
          backgroundColor: dragging ? '#f0f7ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s',
          minHeight: '180px',
        }}
        onMouseEnter={(e) => {
          if (!dragging) {
            e.currentTarget.style.borderColor = '#1890ff';
            e.currentTarget.style.backgroundColor = '#f0f7ff';
          }
        }}
        onMouseLeave={(e) => {
          if (!dragging) {
            e.currentTarget.style.borderColor = '#d9d9d9';
            e.currentTarget.style.backgroundColor = '#fafafa';
          }
        }}
      >
        <InboxOutlined style={{ fontSize: '56px', color: '#1890ff', marginBottom: '16px' }} />
        <p style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333', fontWeight: 500 }}>
          将文件拖放到此处进行上传
        </p>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          或点击选择文件
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {accept && (
            <Tag color="blue">支持格式：{accept}</Tag>
          )}
          {maxFileSize && (
            <Tag color="green">单文件最大：{formatFileSize(maxFileSize)}</Tag>
          )}
          {maxFiles && (
            <Tag color="orange">最多：{maxFiles} 个文件</Tag>
          )}
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: '6px',
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#ff4d4f', fontWeight: 500 }}>验证错误：</p>
          {validationErrors.map((err, idx) => (
            <p key={idx} style={{ margin: '0 0 4px 0', color: '#ff4d4f', fontSize: '12px' }}>{err}</p>
          ))}
          <Button size="small" onClick={() => setValidationErrors([])} style={{ marginTop: '8px' }}>
            清除错误
          </Button>
        </div>
      )}

      {fileList.length > 0 && (
        <div style={{
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#fafafa',
            borderBottom: '1px solid #e8e8e8',
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, color: '#333' }}>
                文件列表 ({fileList.length})
              </span>
              {completedCount > 0 && (
                <Tag color="success">成功 {completedCount}</Tag>
              )}
              {errorCount > 0 && (
                <Tag color="error">失败 {errorCount}</Tag>
              )}
              {uploadingCount > 0 && (
                <Tag color="processing">上传中 {uploadingCount}</Tag>
              )}
            </div>
            {completedCount > 0 && (
              <Button size="small" onClick={handleClearCompleted}>
                清除已完成
              </Button>
            )}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {fileList.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: item.status === 'error' ? '#fff2f0' : 'white',
                }}
              >
                <div style={{ marginRight: '12px' }}>
                  {getStatusIcon(item.status)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '300px',
                    }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                      {formatFileSize(item.size)}
                    </span>
                  </div>

                  {item.status === 'uploading' && (
                    <Progress
                      percent={item.progress || 0}
                      size="small"
                      strokeColor="#1890ff"
                      showInfo={false}
                    />
                  )}

                  {item.status === 'error' && (
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: '#ff4d4f',
                    }}>
                      {item.error}
                    </p>
                  )}
                </div>

                <div style={{ marginLeft: '12px', display: 'flex', gap: '8px' }}>
                  {item.status === 'error' && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleRetryFile(item)}
                    >
                      重试
                    </Button>
                  )}
                  {item.status !== 'uploading' && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(item.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
      `}</style>
    </div>
  );
};

export default AdvancedUploader;
