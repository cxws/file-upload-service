
import { useState, useEffect, useCallback } from 'react';
import { List, Progress, Tag, Button, message, Card } from 'antd';
import { CloseOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getUploadStatuses, cancelUpload, deleteFile, retryUpload } from '../api/fileApi';

/**
 * 上传任务列表组件
 * 用于实时显示和管理上传任务状态
 * 
 * @param {Object} props
 * @param {Object[]} tasks - 上传任务列表
 * @param {Function} [props.onCancel] - 取消上传回调
 * @param {Function} [props.onRemove] - 移除任务回调
 * @param {Function} [props.onRetry] - 重试上传回调
 */
const UploadTaskList = ({ tasks = [], onCancel, onRemove, onRetry }) => {
  const [taskStatuses, setTaskStatuses] = useState([]);

  /**
   * 轮询获取上传状态
   */
  useEffect(() => {
    if (tasks.length === 0) return;

    const interval = setInterval(async () => {
      const fileIds = tasks.map(t => t.id).filter(Boolean);
      if (fileIds.length === 0) return;

      try {
        const statuses = await getUploadStatuses(fileIds);
        setTaskStatuses(statuses);
      } catch (error) {
        console.error('获取上传状态失败:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [tasks]);

  /**
   * 获取任务当前状态
   */
  const getTaskStatus = useCallback((taskId) => {
    return taskStatuses.find(s => s.fileId === taskId);
  }, [taskStatuses]);

  /**
   * 获取状态标签配置
   */
  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { color: 'gold', text: '待上传' },
      UPLOADING: { color: 'blue', text: '上传中' },
      COMPLETED: { color: 'green', text: '上传成功' },
      FAILED: { color: 'red', text: '上传失败' },
      CANCELLED: { color: 'gray', text: '已取消' },
    };
    return configs[status] || { color: 'default', text: status };
  };

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

  /**
   * 处理取消上传
   */
  const handleCancel = useCallback(async (task) => {
    try {
      await cancelUpload(task.id);
      message.success(`已取消上传：${task.name}`);
      onCancel?.(task);
    } catch (error) {
      message.error('取消失败：' + error.message);
    }
  }, [onCancel]);

  /**
   * 处理删除任务
   */
  const handleRemove = useCallback(async (task) => {
    try {
      if (task.id) {
        await deleteFile(task.id);
      }
      message.success(`已移除：${task.name}`);
      onRemove?.(task);
    } catch (error) {
      message.error('删除失败：' + error.message);
    }
  }, [onRemove]);

  /**
   * 处理重试上传
   */
  const handleRetry = useCallback(async (task) => {
    try {
      await retryUpload(task.id);
      message.success(`已重置状态：${task.name}`);
      onRetry?.(task);
    } catch (error) {
      message.error('重试失败：' + error.message);
    }
  }, [onRetry]);

  /**
   * 获取操作按钮
   */
  const getActionButtons = (task) => {
    const status = task.status || getTaskStatus(task.id)?.status;
    
    if (status === 'COMPLETED') {
      return (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemove(task)}
        >
          清除记录
        </Button>
      );
    }
    
    if (status === 'FAILED') {
      return (
        <>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => handleRetry(task)}
          >
            重试
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(task)}
          >
            清除记录
          </Button>
        </>
      );
    }
    
    if (status === 'UPLOADING' || status === 'PENDING') {
      return (
        <Button
          type="text"
          danger
          icon={<CloseOutlined />}
          onClick={() => handleCancel(task)}
        >
          取消
        </Button>
      );
    }
    
    if (status === 'CANCELLED') {
      return (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemove(task)}
        >
          清除记录
        </Button>
      );
    }
    
    return null;
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p>暂无上传任务</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="上传任务列表" bordered={false}>
      <List
        dataSource={tasks}
        renderItem={(task) => {
          const status = getTaskStatus(task.id)?.status || task.status;
          const progress = getTaskStatus(task.id)?.progress || task.progress || 0;
          const errorMessage = getTaskStatus(task.id)?.errorMessage || task.errorMessage;
          const config = getStatusConfig(status);

          return (
            <List.Item
              key={task.id || task.name + Math.random()}
              actions={getActionButtons(task)}
              style={{
                borderBottom: '1px solid #f0f0f0',
                padding: '16px 0',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{task.name}</span>
                  <Tag color={config.color} style={{ marginLeft: '12px' }}>
                    {config.text}
                  </Tag>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#999', marginRight: '16px' }}>
                    {formatFileSize(task.size)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {task.uploadTime ? dayjs(task.uploadTime).format('YYYY-MM-DD HH:mm:ss') : ''}
                  </span>
                </div>

                {(status === 'UPLOADING' || status === 'PENDING') && (
                  <Progress
                    percent={progress}
                    size="small"
                    strokeColor="#1890ff"
                    showInfo={true}
                  />
                )}

                {errorMessage && (
                  <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: '8px' }}>
                    {errorMessage}
                  </div>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default UploadTaskList;
