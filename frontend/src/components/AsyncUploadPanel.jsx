import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Button, LinearProgress, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, IconButton, Chip, Card, CardContent, Stack, Alert, Paper, Divider } from '@mui/material';
import { useAsyncUploadContext } from '../context/AsyncUploadContext';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds) => {
  if (!seconds || seconds === Infinity || isNaN(seconds)) return '--';

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

const formatSpeed = (bytesPerSecond) => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
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

const getStatusText = (task) => {
  switch (task.status) {
    case 'PENDING':
      return '等待上传';
    case 'UPLOADING':
      return '上传中';
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

const AsyncUploadItem = ({ task, onPause, onResume, onCancel, onRetry }) => {
  const isActive = task.status === 'UPLOADING';
  const isPaused = task.status === 'PAUSED';
  const isPending = task.status === 'PENDING';
  const isFailed = task.status === 'FAILED';
  const isCompleted = task.status === 'COMPLETED';
  const isCancellable = isActive || isPaused || isPending;
  const isPausable = isActive;
  const isResumable = isPaused;
  const isRetryable = isFailed;

  return (
    <ListItem
      sx={{
        bgcolor: isFailed ? 'error.light' : isCompleted ? 'success.light' : isPaused ? 'warning.light' : 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1.5,
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          {getStatusIcon(task.status)}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body1"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  mr: 2,
                  textDecoration: isCancellable ? 'none' : 'none',
                  color: isCompleted ? 'success.dark' : isFailed ? 'error.dark' : 'text.primary',
                }}
              >
                {task.fileName}
              </Typography>
              <Chip
                label={`${task.progress}%`}
                color={getStatusColor(task.status)}
                size="small"
                sx={{ minWidth: 60 }}
              />
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {formatFileSize(task.loaded)} / {formatFileSize(task.fileSize)}
              </Typography>
              {isActive && (
                <Typography variant="caption" color="primary" sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <span>⚡ {formatSpeed(task.speed)}</span>
                  <span>⏱ 剩余 {formatTime(task.remainingTime)}</span>
                </Typography>
              )}
              {isCompleted && (
                <Typography variant="caption" color="success.main">
                  ✓ 上传完成
                </Typography>
              )}
              {isFailed && (
                <Typography variant="caption" color="error">
                  ✕ {task.error}
                </Typography>
              )}
              {isPaused && (
                <Typography variant="caption" color="warning.main">
                  ⏸ 已暂停 - {formatFileSize(task.loaded)} / {formatFileSize(task.fileSize)}
                </Typography>
              )}
              {isPending && (
                <Typography variant="caption" color="text.secondary">
                  ⏳ 等待中...
                </Typography>
              )}
            </Box>
          }
        />
      </Box>

      {isActive && (
        <LinearProgress
          variant="determinate"
          value={task.progress || 0}
          sx={{ mb: 1, height: 6, borderRadius: 3 }}
        />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {isPausable && (
          <Button size="small" variant="outlined" onClick={() => onPause(task.id)}>
            暂停
          </Button>
        )}
        {isResumable && (
          <Button size="small" variant="contained" color="warning" onClick={() => onResume(task.id)}>
            继续
          </Button>
        )}
        {isRetryable && (
          <Button size="small" variant="contained" color="primary" onClick={() => onRetry(task.id)}>
            重试
          </Button>
        )}
        {isCancellable && (
          <Button size="small" variant="outlined" color="error" onClick={() => onCancel(task.id)}>
            取消
          </Button>
        )}
      </Box>
    </ListItem>
  );
};

const AsyncUploadPanel = ({ maxHeight = 400 }) => {
  const {
    tasks,
    queueStatus,
    isPaused,
    addFiles,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    pauseAll,
    resumeAll,
    clearCompleted,
  } = useAsyncUploadContext();

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await addFiles(files);
    }
  }, [addFiles]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await addFiles(files);
    }
    e.target.value = '';
  };

  const activeTasks = tasks.filter(t =>
    t.status === 'UPLOADING' || t.status === 'PENDING' || t.status === 'PAUSED'
  );
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const failedTasks = tasks.filter(t => t.status === 'FAILED');

  const totalProgress = tasks.length > 0
    ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length)
    : 0;

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={500}>
              上传中心
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`上传: ${activeTasks.length}`}
                color="primary"
                size="small"
                variant={activeTasks.length > 0 ? 'filled' : 'outlined'}
              />
              <Chip
                label={`完成: ${completedTasks.length}`}
                color="success"
                size="small"
                variant="outlined"
              />
              {failedTasks.length > 0 && (
                <Chip
                  label={`失败: ${failedTasks.length}`}
                  color="error"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1}>
            {isPaused ? (
              <Button size="small" variant="contained" onClick={resumeAll}>
                继续全部
              </Button>
            ) : (
              <Button
                size="small"
                variant="outlined"
                onClick={pauseAll}
                disabled={activeTasks.length === 0}
              >
                暂停全部
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={clearCompleted}
              disabled={completedTasks.length === 0}
            >
              清除已完成
            </Button>
          </Stack>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <Paper
          elevation={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          sx={{
            m: 2,
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
            bgcolor: dragActive ? 'primary.light' : 'grey.50',
            transition: 'all 0.3s',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'primary.light',
            },
          }}
        >
          <Box component="span" sx={{ fontSize: '32px', display: 'block', mb: 1 }}>⬆️</Box>
          <Typography variant="body2" color="text.secondary">
            将文件拖放到此处进行上传 或 点击选择文件
          </Typography>
        </Paper>

        <Divider />

        {tasks.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无上传任务
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight, overflow: 'auto', p: 0 }}>
            {tasks.map((task) => (
              <AsyncUploadItem
                key={task.id}
                task={task}
                onPause={pauseTask}
                onResume={resumeTask}
                onCancel={cancelTask}
                onRetry={retryTask}
              />
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default AsyncUploadPanel;
