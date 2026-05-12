import { useState, useCallback } from 'react';
import { List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction, Chip, IconButton, Typography, Card, CardContent, Box } from '@mui/material';
import { useAsyncUploadContext } from '../context/AsyncUploadContext';

/**
 * 上传任务列表组件
 * 使用 AsyncUploadContext 显示和管理上传任务
 * 
 * @param {Object} props
 * @param {number} [props.maxHeight=400] - 列表最大高度
 */
const UploadTaskList = ({ maxHeight = 400 }) => {
  const {
    tasks,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    clearCompleted,
  } = useAsyncUploadContext();

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return '-';
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '-';
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span style={{ color: '#4caf50', fontSize: '20px' }}>✓</span>;
      case 'FAILED':
        return <span style={{ color: '#f44336', fontSize: '20px' }}>✕</span>;
      case 'UPLOADING':
        return <span style={{ color: '#2196f3', fontSize: '20px' }}>↑</span>;
      case 'PAUSED':
        return <span style={{ color: '#ff9800', fontSize: '20px' }}>⏸</span>;
      case 'PENDING':
        return <span style={{ color: '#9e9e9e', fontSize: '20px' }}>⏳</span>;
      case 'CANCELLED':
        return <span style={{ color: '#9e9e9e', fontSize: '20px' }}>✕</span>;
      default:
        return <span style={{ color: '#757575', fontSize: '20px' }}>📄</span>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return '待上传';
      case 'UPLOADING':
        return '上传中';
      case 'COMPLETED':
        return '上传成功';
      case 'FAILED':
        return '上传失败';
      case 'PAUSED':
        return '已暂停';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'UPLOADING':
        return 'primary';
      case 'PAUSED':
        return 'warning';
      case 'PENDING':
        return 'default';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            暂无上传任务
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxHeight, overflow: 'auto' }}>
      <List sx={{ p: 0 }}>
        {tasks.map((task) => (
          <ListItem
            key={task.id}
            sx={{
              bgcolor: task.status === 'FAILED' ? 'error.light' :
                       task.status === 'COMPLETED' ? 'success.light' :
                       task.status === 'PAUSED' ? 'warning.light' :
                       'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              py: 1.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {getStatusIcon(task.status)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '300px',
                    }}
                  >
                    {task.fileName}
                  </Typography>
                  <Chip
                    label={getStatusText(task.status)}
                    color={getStatusColor(task.status)}
                    size="small"
                    sx={{ ml: 1.5 }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(task.loaded)} / {formatFileSize(task.fileSize)}
                  </Typography>
                  {task.status === 'UPLOADING' && (
                    <Typography variant="caption" color="primary" sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <span>⚡ {formatSpeed(task.speed)}</span>
                      <span>⏱ {formatTime(task.remainingTime)}</span>
                      <span>📊 {task.progress}%</span>
                    </Typography>
                  )}
                  {task.status === 'FAILED' && task.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      ✕ {task.error}
                    </Typography>
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              {task.status === 'UPLOADING' && (
                <IconButton edge="end" onClick={() => pauseTask(task.id)} color="warning" size="small">
                  <span>⏸</span>
                </IconButton>
              )}
              {task.status === 'PAUSED' && (
                <IconButton edge="end" onClick={() => resumeTask(task.id)} color="primary" size="small">
                  <span>▶</span>
                </IconButton>
              )}
              {task.status === 'FAILED' && (
                <IconButton edge="end" onClick={() => retryTask(task.id)} color="primary" size="small">
                  <span>↻</span>
                </IconButton>
              )}
              {(task.status === 'PENDING' || task.status === 'PAUSED' || task.status === 'FAILED') && (
                <IconButton edge="end" onClick={() => cancelTask(task.id)} color="error" size="small">
                  <span>🗑</span>
                </IconButton>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

export default UploadTaskList;
