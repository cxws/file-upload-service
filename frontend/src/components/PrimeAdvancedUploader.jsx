import { useState, useCallback, useRef } from 'react';
import { Upload, Button, Progress, Tag, message } from 'antd';
import { UploadOutlined, FileOutlined, DeleteOutlined, CloseCircleOutlined, CheckCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { uploadFile } from '../api/fileApi';

/**
 * 高级文件上传组件（PrimeVue风格）
 * 支持拖放、多文件上传、手动上传、进度跟踪和验证
 *
 * @param {Object} props
 * @param {boolean} [props.multiple=true] - 是否支持多文件上传
 * @param {string} [props.accept] - 接受的文件类型，如 "image/*", ".pdf,.doc"
 * @param {number} [props.maxFileSize] - 单个文件最大大小（字节）
 * @param {number} [props.maxFiles=10] - 最大文件数量
 * @param {string} [props.targetPath] - 目标存储路径
 * @param {string} [props.description] - 文件描述
 * @param {boolean} [props.overwrite=false] - 是否覆盖同名文件
 * @param {Function} [props.onUploadStart] - 上传开始回调
 * @param {Function} [props.onUploadProgress] - 上传进度回调
 * @param {Function} [props.onUploadSuccess] - 上传成功回调
 * @param {Function} [props.onUploadError] - 上传失败回调
 * @param {Function} [props.onAllUploadComplete] - 全部上传完成回调
 */
const PrimeAdvancedUploader = ({
  multiple = true,
  accept,
  maxFileSize,
  maxFiles = 10,
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

    if (maxFiles && (fileList.length + validFiles.length) > maxFiles) {
      errors.push(`文件数量超出限制（最多 ${maxFiles} 个）`);
      return { errors, validFiles: validFiles.slice(0, maxFiles - fileList.length) };
    }

    return { errors, validFiles };
  }, [accept, maxFileSize, maxFiles, fileList]);

  const addFilesToList = useCallback((files) => {
    const { errors, validFiles } = validateFiles(files);

    if (errors.length > 0) {
      setValidationErrors(prev => [...prev, ...errors]);
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
    }
  }, [validateFiles]);

  const uploadSingleFile = async (fileItem) => {
    const { id, file } = fileItem;

    setUploadingIds(prev => new Set([...prev, id]));
    setFileList(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f));

    onUploadStart?.({ fileId: id, fileName: file.name, fileSize: file.size });

    try {
      const result = await uploadFile(file, {
        targetPath,
        description,
        overwrite,
        onProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setFileList(prev => prev.map(f => f.id === id ? { ...f, progress: percent } : f));
          onUploadProgress?.({ fileId: id, fileName: file.name, percent, loaded: progressEvent.loaded, total: progressEvent.total });
        },
      });

      setFileList(prev => prev.map(f => f.id === id ? { ...f, status: 'completed', progress: 100, result } : f));
      onUploadSuccess?.({ fileId: id, fileName: file.name, fileInfo: result });

    } catch (error) {
      const errorMsg = error.message || '上传失败';
      setFileList(prev => prev.map(f => f.id === id ? { ...f, status: 'error', error: errorMsg } : f));
      onUploadError?.({ fileId: id, fileName: file.name, error: errorMsg });
    } finally {
      setUploadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
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

  const handleUploadAll = () => {
    const pendingFiles = fileList.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      message.warning('没有待上传的文件');
      return;
    }
    pendingFiles.forEach(f => uploadSingleFile(f));
  };

  const handleRemoveFile = (fileId) => {
    if (uploadingIds.has(fileId)) {
      message.warning('文件正在上传中，无法移除');
      return;
    }
    setFileList(prev => prev.filter(f => f.id !== fileId));
  };

  const handleRetryFile = (fileItem) => {
    if (fileItem.status === 'error') {
      uploadSingleFile(fileItem);
    }
  };

  const handleClearAll = () => {
    const uploadingFiles = fileList.filter(f => uploadingIds.has(f.id));
    if (uploadingFiles.length > 0) {
      message.warning('有文件正在上传中，请先取消上传');
      return;
    }
    setFileList([]);
    setValidationErrors([]);
  };

  const handleCancelAll = () => {
    setFileList(prev => prev.map(f => {
      if (f.status === 'uploading' || f.status === 'pending') {
        return { ...f, status: 'cancelled' };
      }
      return f;
    }));
    setUploadingIds(new Set());
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
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />;
      case 'uploading':
        return <UploadOutlined style={{ color: '#1890ff', fontSize: '18px', animation: 'pulse 1s infinite' }} />;
      case 'cancelled':
        return <CloseCircleOutlined style={{ color: '#999', fontSize: '18px' }} />;
      default:
        return <FileOutlined style={{ color: '#999', fontSize: '18px' }} />;
    }
  };

  const pendingCount = fileList.filter(f => f.status === 'pending').length;
  const completedCount = fileList.filter(f => f.status === 'completed').length;
  const errorCount = fileList.filter(f => f.status === 'error').length;
  const uploadingCount = fileList.filter(f => f.status === 'uploading').length;
  const hasFiles = fileList.length > 0;
  const hasPending = pendingCount > 0;
  const isUploading = uploadingCount > 0;

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
          padding: '40px 24px',
          textAlign: 'center',
          border: `2px dashed ${dragging ? '#1890ff' : '#d9d9d9'}`,
          borderRadius: '8px',
          backgroundColor: dragging ? '#f0f7ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s',
          minHeight: '160px',
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
        <InboxOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '12px' }} />
        <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333', fontWeight: 500 }}>
          将文件拖放到此处进行上传
        </p>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          或点击选择文件
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUploadAll}
            disabled={!hasPending || isUploading}
          >
            上传 {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Button>
          <Button
            icon={<CloseCircleOutlined />}
            onClick={handleCancelAll}
            disabled={!isUploading && !hasPending}
          >
            取消
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleClearAll}
            disabled={!hasFiles}
          >
            清除
          </Button>
        </div>

        {hasFiles && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {completedCount > 0 && <Tag color="success">成功 {completedCount}</Tag>}
            {errorCount > 0 && <Tag color="error">失败 {errorCount}</Tag>}
            {uploadingCount > 0 && <Tag color="processing">上传中 {uploadingCount}</Tag>}
            {pendingCount > 0 && <Tag>待上传 {pendingCount}</Tag>}
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: '6px',
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#ff4d4f', fontWeight: 500, fontSize: '14px' }}>验证错误：</p>
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
            <span style={{ fontWeight: 500, color: '#333' }}>
              文件列表 ({fileList.length})
            </span>
            {accept && (
              <span style={{ fontSize: '12px', color: '#999' }}>
                支持格式：{accept}
              </span>
            )}
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {fileList.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: item.status === 'error' ? '#fff2f0' : item.status === 'cancelled' ? '#f5f5f5' : 'white',
                }}
              >
                <div style={{ marginRight: '12px' }}>
                  {getStatusIcon(item.status)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '14px',
                      color: item.status === 'cancelled' ? '#999' : '#333',
                      textDecoration: item.status === 'cancelled' ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '300px',
                    }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px', flexShrink: 0 }}>
                      {formatFileSize(item.size)}
                    </span>
                  </div>

                  {item.status === 'uploading' && (
                    <Progress
                      percent={item.progress || 0}
                      size="small"
                      strokeColor="#1890ff"
                      format={(percent) => `${percent}%`}
                    />
                  )}

                  {item.status === 'error' && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ff4d4f' }}>
                      {item.error}
                    </p>
                  )}

                  {item.status === 'completed' && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#52c41a' }}>
                      上传成功
                    </p>
                  )}

                  {item.status === 'cancelled' && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
                      已取消
                    </p>
                  )}
                </div>

                <div style={{ marginLeft: '12px', display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {item.status === 'error' && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleRetryFile(item)}
                    >
                      重试
                    </Button>
                  )}
                  {(item.status === 'pending' || item.status === 'cancelled') && !uploadingIds.has(item.id) && (
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

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default PrimeAdvancedUploader;