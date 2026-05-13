import { useState, useCallback, useRef, useEffect } from 'react';
import { Drawer, Badge, theme } from 'antd';
import { UploadOutlined, InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import UploadTaskList from './UploadTaskList';
import FileList from './FileList';

const { useToken } = theme;

/**
 * 可拖拽的右上角悬浮上传框
 *
 * @param {Object} props
 * @param {Object[]} props.uploadTasks - 上传任务列表
 * @param {Function} [props.onCancel] - 取消上传回调
 * @param {Function} [props.onRemove] - 移除任务回调
 * @param {Function} [props.onRetry] - 重试上传回调
 * @param {Function} [props.onFileClick] - 点击文件回调
 * @param {Function} [props.onStatusChange] - 状态变化回调
 * @param {Function} [props.onOpenUpload] - 打开上传页面回调
 */
const DraggableFloatingBox = ({
  uploadTasks = [],
  onCancel,
  onRemove,
  onRetry,
  onFileClick,
  onStatusChange,
  onOpenUpload,
}) => {
  const { token } = useToken();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [position, setPosition] = useState({ x: window.innerWidth - 70, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });

  const hasUploadingTasks = uploadTasks.some(t =>
    t.status === 'PENDING' || t.status === 'PROCESSING'
  );
  const uploadingCount = uploadTasks.filter(t =>
    t.status === 'PENDING' || t.status === 'PROCESSING'
  ).length;

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { ...position };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    let newX = elementStartPos.current.x + dx;
    let newY = elementStartPos.current.y + dy;

    // 限制在视口范围内
    const minX = 0;
    const maxX = window.innerWidth - 56;
    const minY = 0;
    const maxY = window.innerHeight - 56;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseLeave);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleMouseLeave]);

  const handleClick = (e) => {
    if (isDragging) return;
    if (hasUploadingTasks || uploadTasks.length > 0) {
      showDrawer();
    } else if (onOpenUpload) {
      onOpenUpload();
    } else {
      showDrawer();
    }
  };

  const TabButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        background: 'transparent',
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: 14,
        borderBottom: active ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
        color: active ? token.colorPrimary : token.colorTextSecondary,
        fontWeight: active ? 500 : 'normal',
        marginBottom: -1,
        outline: 'none',
      }}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* 可拖拽的悬浮按钮 */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <Badge count={hasUploadingTasks ? uploadingCount : 0} offset={[10, 10]}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hasUploadingTasks ? token.colorPrimary : token.colorBgElevated,
              boxShadow: token.boxShadow,
              border: `1px solid ${token.colorBorder}`,
              transition: 'all 0.2s',
            }}
          >
            {hasUploadingTasks ? (
              <UploadOutlined style={{ fontSize: 24, color: token.colorTextLightSolid }} />
            ) : (
              <InboxOutlined style={{ fontSize: 24, color: token.colorText }} />
            )}
          </div>
        </Badge>
      </div>

      {/* 抽屉面板 */}
      <Drawer
        title="上传管理"
        placement="right"
        onClose={onClose}
        open={open}
        width={640}
        maskClosable
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 标签页切换 */}
          <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${token.colorBorder}` }}>
            <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>
              <UploadOutlined style={{ marginRight: 4 }} />
              上传任务
            </TabButton>
            <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
              <FileTextOutlined style={{ marginRight: 4 }} />
              文件列表
            </TabButton>
          </div>

          {/* 标签页内容 */}
          {activeTab === 'tasks' && (
            <UploadTaskList
              tasks={uploadTasks}
              onCancel={onCancel}
              onRemove={onRemove}
              onRetry={onRetry}
            />
          )}
          {activeTab === 'files' && (
            <FileList
              status="ALL"
              pageSize={10}
              onFileClick={onFileClick}
              onStatusChange={onStatusChange}
            />
          )}
        </div>
      </Drawer>
    </>
  );
};

export default DraggableFloatingBox;
