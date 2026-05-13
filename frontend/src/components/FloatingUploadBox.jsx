import { useState, useCallback } from 'react';
import { Drawer, Badge, FloatButton, Tabs, theme } from 'antd';
import { UploadOutlined, InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import UploadTaskList from './UploadTaskList';
import FileList from './FileList';

const { TabPane } = Tabs;
const { useToken } = theme;

/**
 * 右上角悬浮上传框
 * 有上传任务时显示传输小框，无任务时显示上传图标
 * 点击弹出面板，展示上传任务和文件列表
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
const FloatingUploadBox = ({
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

  const hasUploadingTasks = uploadTasks.some(t =>
    t.status === 'UPLOADING' || t.status === 'PENDING'
  );
  const uploadingCount = uploadTasks.filter(t =>
    t.status === 'UPLOADING'
  ).length;

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const handleFloatButtonClick = () => {
    if (hasUploadingTasks || uploadTasks.length > 0) {
      showDrawer();
    } else if (onOpenUpload) {
      onOpenUpload();
    } else {
      showDrawer();
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      {hasUploadingTasks ? (
        <Badge count={uploadingCount} offset={[10, 10]}>
          <FloatButton
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleFloatButtonClick}
            style={{
              right: 24,
              bottom: 24,
              boxShadow: token.boxShadow,
            }}
          />
        </Badge>
      ) : (
        <FloatButton
          type="default"
          icon={<InboxOutlined />}
          onClick={handleFloatButtonClick}
          style={{
            right: 24,
            bottom: 24,
            boxShadow: token.boxShadow,
          }}
        />
      )}

      {/* 抽屉面板 */}
      <Drawer
        title="上传管理"
        placement="right"
        onClose={onClose}
        open={open}
        width={640}
        maskClosable
      >
        <Tabs defaultActiveKey="tasks" size="large">
          <TabPane
            tab={
              <span>
                <UploadOutlined />
                上传任务
              </span>
            }
            key="tasks"
          >
            <UploadTaskList
              tasks={uploadTasks}
              onCancel={onCancel}
              onRemove={onRemove}
              onRetry={onRetry}
            />
          </TabPane>
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                文件列表
              </span>
            }
            key="files"
          >
            <FileList
              status="ALL"
              pageSize={10}
              onFileClick={onFileClick}
              onStatusChange={onStatusChange}
            />
          </TabPane>
        </Tabs>
      </Drawer>
    </>
  );
};

export default FloatingUploadBox;
