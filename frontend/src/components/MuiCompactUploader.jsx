import { useState, useCallback, useRef } from 'react';
import { Box, Button, LinearProgress, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, IconButton, Chip, Card, CardContent, Stack, Alert, Paper } from '@mui/material';
import { uploadFile } from '../api/fileApi';

/**
 * MUI风格单行紧凑文件上传组件
 * 使用 HTML5 Drag and Drop API + MUI 组件
 *
 * @param {Object} props
 * @param {boolean} [props.multiple=true] - 是否支持多文件上传
 * @param {string} [props.accept] - 接受的文件类型，如 "image/*,.pdf,.doc"
 * @param {number} [props.maxFileSize] - 单个文件最大大小（字节）
 * @param {number} [props.maxFiles=10] - 最大文件数量
 * @param {Function} [props.onUploadStart] - 上传开始回调
 * @param {Function} [props.onUploadProgress] - 上传进度回调
 * @param {Function} [props.onUploadSuccess] - 上传成功回调
 * @param {Function} [props.onUploadError] - 上传失败回调
 * @param {Function} [props.onAllUploadComplete] - 全部上传完成回调
 */
const MuiCompactUploader = ({
  multiple = true,
  accept,
  maxFileSize,
  maxFiles = 10,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  onAllUploadComplete,
}) => {
  const [fileList, setFileList] = useState([]);
  const [uploadingIds, setUploadingIds] = useState(new Set());
  const [validationErrors, setValidationErrors] = useState([]);
  const [dragActive, setDragActive] = useState(false);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

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

  const uploadSingleFile = async (fileItem) => {
    const { id, file } = fileItem;

    setUploadingIds(prev => new Set([...prev, id]));
    setFileList(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f));

    onUploadStart?.({ fileId: id, fileName: file.name, fileSize: file.size });

    try {
      const result = await uploadFile(file, {
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
    if (pendingFiles.length === 0) return;
    pendingFiles.forEach(f => uploadSingleFile(f));
  };

  const handleRemoveFile = (fileId) => {
    if (uploadingIds.has(fileId)) return;
    setFileList(prev => prev.filter(f => f.id !== fileId));
  };

  const handleRetryFile = (fileItem) => {
    if (fileItem.status === 'error') {
      uploadSingleFile(fileItem);
    }
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

  const handleClearAll = () => {
    const uploadingFiles = fileList.filter(f => uploadingIds.has(f.id));
    if (uploadingFiles.length > 0) return;
    setFileList([]);
    setValidationErrors([]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <span style={{ color: '#4caf50', fontSize: '24px' }}>✓</span>;
      case 'error':
        return <span style={{ color: '#f44336', fontSize: '24px' }}>✕</span>;
      case 'uploading':
        return <span style={{ color: '#2196f3', fontSize: '24px' }}>↑</span>;
      case 'cancelled':
        return <span style={{ color: '#9e9e9e', fontSize: '24px' }}>✕</span>;
      default:
        return <span style={{ color: '#757575', fontSize: '24px' }}>📄</span>;
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* 单行紧凑上传区域 */}
      <Paper
        elevation={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: '1px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          borderRadius: 1,
          p: 1,
          bgcolor: dragActive ? 'primary.light' : 'grey.50',
          transition: 'all 0.3s',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.light',
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box component="span" sx={{ fontSize: '24px', display: 'flex', alignItems: 'center' }}>⬆️</Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              将文件拖放到此处进行上传 或
            </Typography>
            <Button
              size="small"
              variant="text"
              color="primary"
              onClick={handleBrowseClick}
            >
              点击选择文件
            </Button>
          </Stack>

          {hasFiles && (
            <Stack direction="row" spacing={1}>
              {uploadingCount > 0 && <Chip label={`上传中 ${uploadingCount}`} color="primary" size="small" />}
              {pendingCount > 0 && <Chip label={`待上传 ${pendingCount}`} variant="outlined" size="small" />}
              {completedCount > 0 && <Chip label={`成功 ${completedCount}`} color="success" size="small" />}
              {errorCount > 0 && <Chip label={`失败 ${errorCount}`} color="error" size="small" />}
            </Stack>
          )}

          <Stack direction="row" spacing={1}>
            {hasFiles && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleUploadAll}
                  disabled={!hasPending || isUploading}
                >
                  上传
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCancelAll}
                  disabled={!isUploading && !hasPending}
                >
                  取消
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleClearAll}
                  disabled={!hasFiles}
                >
                  清除
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

      {validationErrors.length > 0 && (
        <Alert severity="error" onClose={() => setValidationErrors([])}>
          <Typography variant="subtitle2" gutterBottom>验证错误：</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}><Typography variant="body2">{err}</Typography></li>
            ))}
          </ul>
        </Alert>
      )}

      {fileList.length > 0 && (
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ bgcolor: 'grey.100', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={500}>
                文件列表 ({fileList.length})
              </Typography>
            </Box>
            <List sx={{ maxHeight: 300, overflow: 'auto', p: 0 }}>
              {fileList.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    bgcolor: item.status === 'error' ? 'error.light' : item.status === 'cancelled' ? 'grey.100' : 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 0.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getStatusIcon(item.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: item.status === 'cancelled' ? 'line-through' : 'none',
                          color: item.status === 'cancelled' ? 'text.disabled' : 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 400,
                        }}
                      >
                        {item.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" component="span">
                          {formatFileSize(item.size)}
                          {item.status === 'error' && (
                            <Typography variant="caption" color="error" component="span" sx={{ ml: 1 }}>
                              — {item.error}
                            </Typography>
                          )}
                          {item.status === 'completed' && (
                            <Typography variant="caption" color="success.main" component="span" sx={{ ml: 1 }}>
                              — 上传成功
                            </Typography>
                          )}
                          {item.status === 'cancelled' && (
                            <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 1 }}>
                              — 已取消
                            </Typography>
                          )}
                        </Typography>
                        {item.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={item.progress || 0}
                            sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {item.status === 'error' && (
                      <IconButton edge="end" onClick={() => handleRetryFile(item)} color="primary" size="small">
                        <span>↻</span>
                      </IconButton>
                    )}
                    {(item.status === 'pending' || item.status === 'cancelled') && !uploadingIds.has(item.id) && (
                      <IconButton edge="end" onClick={() => handleRemoveFile(item.id)} color="error" size="small">
                        <span>🗑</span>
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MuiCompactUploader;
