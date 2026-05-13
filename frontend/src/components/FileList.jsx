import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Popconfirm, message, Empty } from 'antd';
import { DeleteOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getFileList, deleteFile, retryUpload, cancelUpload } from '../api/fileApi';

/**
 * 通用文件列表组件
 * 支持分页、筛选、排序、删除、重试、取消等操作
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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize,
    total: 0,
  });

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

      setData(result.files || []);
      setPagination({
        current: result.page || 1,
        pageSize: result.size || pageSize,
        total: result.total || 0,
      });
    } catch (error) {
      message.error('加载文件列表失败：' + error.message);
    } finally {
      setLoading(false);
    }
  }, [status, fileName, pageSize]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadFileList();
  }, [loadFileList]);

  /**
   * 处理删除
   */
  const handleDelete = useCallback(async (fileId, fileName) => {
    try {
      await deleteFile(fileId);
      message.success(`文件已删除：${fileName}`);
      loadFileList(pagination.current);
      onStatusChange?.({ fileId, status: 'DELETED' });
    } catch (error) {
      message.error('删除失败：' + error.message);
    }
  }, [loadFileList, pagination.current, onStatusChange]);

  /**
   * 处理重试
   */
  const handleRetry = useCallback(async (fileId, fileName) => {
    try {
      await retryUpload(fileId);
      message.success(`已重置状态：${fileName}`);
      loadFileList(pagination.current);
      onStatusChange?.({ fileId, status: 'PENDING' });
    } catch (error) {
      message.error('重试失败：' + error.message);
    }
  }, [loadFileList, pagination.current, onStatusChange]);

  /**
   * 处理取消
   */
  const handleCancel = useCallback(async (fileId, fileName) => {
    try {
      await cancelUpload(fileId);
      message.success(`已取消上传：${fileName}`);
      loadFileList(pagination.current);
      onStatusChange?.({ fileId, status: 'CANCELLED' });
    } catch (error) {
      message.error('取消失败：' + error.message);
    }
  }, [loadFileList, pagination.current, onStatusChange]);

  /**
   * 处理分页变化
   */
  const handlePageChange = useCallback((page, pageSize) => {
    loadFileList(page, pageSize);
  }, [loadFileList]);

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
   * 获取状态标签配置
   */
  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { color: 'gold', text: '待上传' },
      UPLOADING: { color: 'blue', text: '上传中' },
      COMPLETED: { color: 'green', text: '已完成' },
      FAILED: { color: 'red', text: '失败' },
      CANCELLED: { color: 'gray', text: '已取消' },
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
      ellipsis: true,
      onCell: (record) => ({
        onClick: () => onFileClick?.(record),
        style: { cursor: 'pointer', color: '#1890ff' },
      }),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (text) => formatFileSize(text),
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text) => {
        const config = getStatusConfig(text);
        return (
          <Tag color={config.color}>
            {config.text}
            {text === 'UPLOADING' && (
              <span style={{ marginLeft: '8px' }}>{data.find(d => d.id === data?.id)?.progress}%</span>
            )}
          </Tag>
        );
      },
      width: 120,
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const actions = [];

        if (record.status === 'FAILED') {
          actions.push(
            <Button
              key="retry"
              type="link"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record.id, record.originalFileName)}
              style={{ padding: '4px 8px' }}
            >
              重试
            </Button>
          );
        }

        if (record.status === 'UPLOADING' || record.status === 'PENDING') {
          actions.push(
            <Button
              key="cancel"
              type="link"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleCancel(record.id, record.originalFileName)}
              style={{ padding: '4px 8px' }}
            >
              取消
            </Button>
          );
        }

        actions.push(
          <Popconfirm
            key="delete"
            title={`确定删除文件 "${record.originalFileName}" 吗？`}
            onConfirm={() => handleDelete(record.id, record.originalFileName)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              style={{ padding: '4px 8px' }}
            >
              删除
            </Button>
          </Popconfirm>
        );

        return actions;
      },
      width: 180,
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{
          ...pagination,
          onChange: handlePageChange,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        loading={loading}
        bordered
        locale={{
          emptyText: <Empty description="暂无文件" />,
        }}
      />
    </div>
  );
};

export default FileList;