import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Chip, Box, Typography, LinearProgress, CircularProgress } from '@mui/material';
import { useAsyncUploadContext } from '../context/AsyncUploadContext';
import { getFileList, deleteFile, retryUpload, cancelUpload } from '../api/fileApi';

/**
 * 通用文件列表组件
 * 支持分页、筛选、排序、删除、重试、取消等操作
 * 整合 AsyncUploadContext 实时显示上传进度
 *
 * @param {Object} props
 * @param {string} [props.status] - 状态筛选：ALL, PENDING, UPLOADING, COMPLETED, FAILED, CANCELLED
 * @param {string} [props.fileName] - 文件名搜索
 * @param {number} [props.pageSize=20] - 每页大小
 * @param {Function} [props.onFileClick] - 点击文件回调
 * @param {Function} [props.onStatusChange] - 状态变化回调
 */
const FileList = ({
  status = 'ALL',
  fileName,
  pageSize = 20,
  onFileClick,
  onStatusChange,
}) => {
  const { tasks } = useAsyncUploadContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize,
    total: 0,
  });

  // 合并异步队列中的任务和数据库中的文件
  const mergeTasksAndFiles = useCallback((files) => {
    if (!files || !Array.isArray(files)) return [];
    
    // 创建一个 Map 用于快速查找异步任务
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    return files.map(file => {
      const task = taskMap.get(file.id);
      if (task) {
        return {
          ...file,
          progress: task.progress,
          loaded: task.loaded,
          speed: task.speed,
          remainingTime: task.remainingTime,
          status: task.status,
        };
      }
      return file;
    });
  }, [tasks]);

  /**
   * 加载文件列表
   */
  const loadFileList = useCallback(async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      const result = await getFileList({
        page,
        size,
        status: status === 'ALL' ? undefined : status,
        fileName,
        sortBy: 'createdAt',
        sortDirection: 'DESC',
      });

      const mergedFiles = mergeTasksAndFiles(result.files || []);
      setData(mergedFiles);
      setPagination({
        current: result.page || 1,
        pageSize: result.size || pageSize,
        total: result.total || 0,
      });
    } catch (error) {
      console.error('加载文件列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [status, fileName, pageSize, mergeTasksAndFiles]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadFileList();
  }, [loadFileList]);

  // 当异步任务变化时，更新列表中的数据
  useEffect(() => {
    if (data.length > 0) {
      setData(prev => mergeTasksAndFiles(prev));
    }
  }, [tasks, mergeTasksAndFiles, data.length]);

  /**
   * 处理删除
   */
  const handleDelete = useCallback(async (fileId, fileName) => {
    try {
      await deleteFile(fileId);
      loadFileList(pagination.current);
      onStatusChange?.({ fileId, status: 'DELETED' });
    } catch (error) {
      console.error('删除失败:', error);
    }
  }, [loadFileList, pagination.current, onStatusChange]);

  /**
   * 处理重试
   */
  const handleRetry = useCallback(async (fileId, fileName) => {
    try {
      await retryUpload(fileId);
      loadFileList(pagination.current);
      onStatusChange?.({ fileId, status: 'PENDING' });
    } catch (error) {
      console.error('重试失败:', error);
    }
  }, [loadFileList, pagination.current, onStatusChange]);

  /**
   * 处理取消
   */
  const handleCancel = useCallback(async (fileId, fileName) => {
    try {
      await cancelUpload(fileId);
      loadFileList(pagination.current);
      onStatusChange?.({ fileId, status: 'CANCELLED' });
    } catch (error) {
      console.error('取消失败:', error);
    }
  }, [loadFileList, pagination.current, onStatusChange]);

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
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

  /**
   * 获取状态标签配置
   */
  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { color: 'warning', text: '待上传' },
      UPLOADING: { color: 'primary', text: '上传中' },
      COMPLETED: { color: 'success', text: '已完成' },
      FAILED: { color: 'error', text: '失败' },
      CANCELLED: { color: 'default', text: '已取消' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  /**
   * 表格列配置
   */
  const columns = [
    {
      title: '文件名',
      dataIndex: 'originalFileName',
      key: 'originalFileName',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <Typography
          variant="body2"
          sx={{
            cursor: 'pointer',
            color: '#1976d2',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
          onClick={() => onFileClick?.(record)}
        >
          {text}
        </Typography>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (text, record) => {
        if (record.status === 'UPLOADING' && record.loaded) {
          return (
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(record.loaded)} / {formatFileSize(text)}
            </Typography>
          );
        }
        return <Typography variant="body2">{formatFileSize(text)}</Typography>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 250,
      render: (text, record) => {
        const config = getStatusConfig(text);
        const progress = record.progress || 0;
        const speed = record.speed;
        const remainingTime = record.remainingTime;

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Chip label={config.text} color={config.color} size="small" />
            {text === 'UPLOADING' && (
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="caption" color="primary">
                    📊 {progress}%
                  </Typography>
                  {speed > 0 && (
                    <Typography variant="caption" color="primary">
                      ⚡ {formatSpeed(speed)}
                    </Typography>
                  )}
                  {remainingTime && (
                    <Typography variant="caption" color="primary">
                      ⏱ {formatTime(remainingTime)}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => (
        <Typography variant="body2" color="text.secondary">
          {text || '-'}
        </Typography>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const actions = [];

        if (record.status === 'FAILED') {
          actions.push(
            <Button
              key="retry"
              size="small"
              variant="text"
              color="primary"
              onClick={() => handleRetry(record.id, record.originalFileName)}
            >
              重试
            </Button>
          );
        }

        if (record.status === 'UPLOADING' || record.status === 'PENDING') {
          actions.push(
            <Button
              key="cancel"
              size="small"
              variant="text"
              color="error"
              onClick={() => handleCancel(record.id, record.originalFileName)}
            >
              取消
            </Button>
          );
        }

        actions.push(
          <Button
            key="delete"
            size="small"
            variant="text"
            color="error"
            onClick={() => handleDelete(record.id, record.originalFileName)}
          >
            删除
          </Button>
        );

        return <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>;
      },
    },
  ];

  return (
    <Box>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{
          ...pagination,
          onChange: (page, size) => loadFileList(page, size),
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        loading={{
          indicator: <CircularProgress size={24} />,
          spinning: loading,
        }}
        bordered
        sx={{
          '& .MuiTableCell-root': {
            py: 1.5,
          },
        }}
      />
    </Box>
  );
};

export default FileList;
