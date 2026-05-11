import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Button, LinearProgress, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, IconButton, Chip, Card, CardContent, Stack, Alert, Paper } from '@mui/material';
import { useAsyncUploadContext } from '../context/AsyncUploadContext';

/**
 * MUI风格异步文件上传组件
 * 集成全局异步上传队列
 *
 * @param {Object} props
 * @param {boolean} [props.multiple=true] - 是否支持多文件上传
 * @param {string} [props.accept] - 接受的文件类型
 * @param {number} [props.maxFileSize] - 单个文件最大大小
 * @param {number} [props.maxFiles=10] - 最大文件数量
 */
const MuiCompactUploader = ({
  multiple = true,
  accept,
  maxFileSize,
  maxFiles = 10,
}) => {
  const {
    tasks,
    addFiles,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    queueStatus,
  } = useAsyncUploadContext();

  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

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

    const currentTaskCount = tasks.length;
    const remainingSlots = maxFiles - currentTaskCount;

    Array.from(files).forEach((file) => {
      let error = null;

      if (remainingSlots <= 0) {
        error = `文件数量超出限制（最多 ${maxFiles} 个）`;
      } else if (maxFileSize && file.size > maxFileSize) {
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

    return { errors, validFiles };
  }, [accept, maxFileSize, maxFiles, tasks.length]);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const { errors, validFiles } = validateFiles(files);

      if (errors.length > 0) {
        setValidationErrors(prev => [...prev, ...errors]);
      }

      if (validFiles.length > 0) {
        addFiles(validFiles);
      }
    }
  }, [validateFiles, addFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const { errors, validFiles } = validateFiles(files);

      if (errors.length > 0) {
        setValidationErrors(prev => [...prev, ...errors]);
      }

      if (validFiles.length > 0) {
        addFiles(validFiles);
      }
    }
    e.target.value = '';
  }, [validateFiles, addFiles]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span style={{ color: '#4caf50', fontSize: '24px' }}>✓</span>;
      case 'FAILED':
        return <span style={{ color: '#f44336', fontSize: '24px' }}>✕</span>;
      case 'UPLOADING':
        return <span style={{ color: '#2196f3', fontSize: '24px' }}>↑</span>;
      case 'PAUSED':
        return <span style={{ color: '#ff9800', fontSize: '24px' }}>⏸</span>;
      case 'PENDING':
        return <span style={{ color: '#9e9e9e', fontSize: '24px' }}>⏳</span>;
      case 'CANCELLED':
        return <span style={{ color: '#9e9e9e', fontSize: '24px' }}>✕</span>;
      default:
        return <span style={{ color: '#757575', fontSize: '24px' }}>📄</span>;
    }
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '';
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return '';
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}分${secs}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}时${mins}分`;
    }
  };

  const getTaskStatusText = (task) => {
    switch (task.status) {
      case 'PENDING':
        return '等待中';
      case 'UPLOADING':
        return `↑ ${formatSpeed(task.speed)} · 剩余 ${formatTime(task.remainingTime)}`;
      case 'COMPLETED':
        return '上传成功';
      case 'FAILED':
        return task.error || '上传失败';
      case 'PAUSED':
        return '已暂停';
      case 'CANCELLED':
        return '已取消';
      default:
        return '';
    }
  };

  const activeTasks = tasks.filter(t =>
    t.status === 'UPLOADING' || t.status === 'PENDING' || t.status === 'PAUSED'
  );
  const uploadingCount = tasks.filter(t => t.status === 'UPLOADING').length;
  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const failedCount = tasks.filter(t => t.status === 'FAILED').length;
  const pausedCount = tasks.filter(t => t.status === 'PAUSED').length;
  const hasFiles = tasks.length > 0;
  const hasActiveTasks = activeTasks.length > 0;
  const hasPausedTasks = pausedCount > 0;
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
              {isUploading && <Chip label={`上传中 ${uploadingCount}`} color="primary" size="small" />}
              {pendingCount > 0 && <Chip label={`待上传 ${pendingCount}`} variant="outlined" size="small" />}
              {completedCount > 0 && <Chip label={`成功 ${completedCount}`} color="success" size="small" />}
              {failedCount > 0 && <Chip label={`失败 ${failedCount}`} color="error" size="small" />}
              {hasPausedTasks && <Chip label={`已暂停 ${pausedCount}`} color="warning" size="small" />}
            </Stack>
          )}
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

      {hasFiles && (
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ bgcolor: 'grey.100', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={500}>
                上传队列 ({tasks.length})
              </Typography>
            </Box>
            <List sx={{ maxHeight: 300, overflow: 'auto', p: 0 }}>
              {tasks.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    bgcolor: item.status === 'FAILED' ? 'error.light' :
                           item.status === 'COMPLETED' ? 'success.light' :
                           item.status === 'PAUSED' ? 'warning.light' : 'background.paper',
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
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 400,
                        }}
                      >
                        {item.fileName}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" component="span">
                          {formatFileSize(item.loaded)} / {formatFileSize(item.fileSize)}
                          {item.status === 'UPLOADING' && (
                            <Typography variant="caption" color="primary" component="span" sx={{ ml: 1 }}>
                              {getTaskStatusText(item)}
                            </Typography>
                          )}
                          {item.status === 'COMPLETED' && (
                            <Typography variant="caption" color="success.main" component="span" sx={{ ml: 1 }}>
                              ✓
                            </Typography>
                          )}
                          {item.status === 'FAILED' && (
                            <Typography variant="caption" color="error" component="span" sx={{ ml: 1 }}>
                              — {item.error}
                            </Typography>
                          )}
                          {item.status === 'PAUSED' && (
                            <Typography variant="caption" color="warning.main" component="span" sx={{ ml: 1 }}>
                              — 已暂停
                            </Typography>
                          )}
                          {item.status === 'PENDING' && (
                            <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                              — 等待中
                            </Typography>
                          )}
                        </Typography>
                        {item.status === 'UPLOADING' && (
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
                    {item.status === 'UPLOADING' && (
                      <IconButton edge="end" onClick={() => pauseTask(item.id)} color="warning" size="small">
                        <span>⏸</span>
                      </IconButton>
                    )}
                    {item.status === 'PAUSED' && (
                      <IconButton edge="end" onClick={() => resumeTask(item.id)} color="primary" size="small">
                        <span>▶</span>
                      </IconButton>
                    )}
                    {item.status === 'FAILED' && (
                      <IconButton edge="end" onClick={() => retryTask(item.id)} color="primary" size="small">
                        <span>↻</span>
                      </IconButton>
                    )}
                    {(item.status === 'PENDING' || item.status === 'PAUSED' || item.status === 'FAILED') && (
                      <IconButton edge="end" onClick={() => cancelTask(item.id)} color="error" size="small">
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
