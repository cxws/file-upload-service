import { useState, useCallback } from 'react';
import { Tabs, Card, message } from 'antd';
import FileUploader from './FileUploader';
import FileList from './FileList';
import UploadTaskList from './UploadTaskList';
import AdvancedUploader from './AdvancedUploader';
import PrimeAdvancedUploader from './PrimeAdvancedUploader';
import MuiNativeUploader from './MuiNativeUploader';
import MuiCompactUploader from './MuiCompactUploader';
import DraggableFloatingBox from './DraggableFloatingBox';
import { uploadFiles } from '../api/fileApi';

const { TabPane } = Tabs;

/**
 * 文件上传演示组件
 * 展示上传组件和文件列表组件的使用方式
 */
const FileUploadDemo = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadTasks, setUploadTasks] = useState([]);

  /**
   * 处理打开上传页面
   */
  const handleOpenUpload = useCallback(() => {
    setActiveTab('upload');
  }, []);

  /**
   * 处理文件上传开始
   */
  const handleUploadStart = useCallback(({ fileName, fileSize }) => {
    const newTask = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      size: fileSize,
      status: 'UPLOADING',
      progress: 0,
      uploadTime: new Date().toISOString(),
    };
    setUploadTasks(prev => [...prev, newTask]);
  }, []);

  /**
   * 处理上传进度
   */
  const handleUploadProgress = useCallback(({ fileName, percent }) => {
    setUploadTasks(prev => prev.map(task => task.name === fileName ? { ...task, progress: percent } : task));
  }, []);

  /**
   * 处理上传成功
   */
  const handleUploadSuccess = useCallback(({ fileName, fileInfo }) => {
    setUploadTasks(prev => prev.map(task => task.name === fileName ? {
      ...task,
      id: fileInfo.id,
      status: 'COMPLETED',
      progress: 100,
    } : task));
  }, []);

  /**
   * 处理上传失败
   */
  const handleUploadError = useCallback(({ fileName, error }) => {
    setUploadTasks(prev => prev.map(task => task.name === fileName ? {
      ...task,
      status: 'FAILED',
      errorMessage: error,
    } : task));
  }, []);

  /**
   * 处理取消上传
   */
  const handleCancel = useCallback((task) => {
    setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'CANCELLED' } : t));
  }, []);

  /**
   * 处理移除任务
   */
  const handleRemove = useCallback((task) => {
    setUploadTasks(prev => prev.filter(t => t.id !== task.id));
  }, []);

  /**
   * 处理重试上传
   */
  const handleRetry = useCallback((task) => {
    setUploadTasks(prev => prev.map(t => t.id === task.id ? {
      ...t,
      status: 'UPLOADING',
      progress: 0,
      errorMessage: null,
    } : t));
  }, []);

  /**
   * 处理文件列表状态变化
   */
  const handleFileStatusChange = useCallback(({ fileId, status }) => {
    if (status === 'DELETED') {
      setUploadTasks(prev => prev.filter(t => t.id !== fileId));
    }
  }, []);

  /**
   * 处理文件点击
   */
  const handleFileClick = useCallback((file) => {
    message.info(`点击文件：${file.originalFileName}`);
  }, []);

  /**
   * 处理高级上传开始
   */
  const handleAdvancedUploadStart = useCallback(({ fileId, fileName, fileSize }) => {
    const newTask = {
      id: fileId,
      name: fileName,
      size: fileSize,
      status: 'UPLOADING',
      progress: 0,
      uploadTime: new Date().toISOString(),
    };
    setUploadTasks(prev => [...prev, newTask]);
  }, []);

  /**
   * 处理高级上传进度
   */
  const handleAdvancedUploadProgress = useCallback(({ fileId, fileName, percent }) => {
    setUploadTasks(prev => prev.map(task => task.id === fileId ? { ...task, progress: percent } : task));
  }, []);

  /**
   * 处理高级上传成功
   */
  const handleAdvancedUploadSuccess = useCallback(({ fileId, fileName, fileInfo }) => {
    setUploadTasks(prev => prev.map(task => task.id === fileId ? {
      ...task,
      status: 'COMPLETED',
      progress: 100,
    } : task));
  }, []);

  /**
   * 处理高级上传失败
   */
  const handleAdvancedUploadError = useCallback(({ fileId, fileName, error }) => {
    setUploadTasks(prev => prev.map(task => task.id === fileId ? {
      ...task,
      status: 'FAILED',
      errorMessage: error,
    } : task));
  }, []);

  /**
   * 处理高级上传全部完成
   */
  const handleAdvancedUploadComplete = useCallback(({ success, failed }) => {
    if (failed === 0) {
      message.success(`全部上传成功！共 ${success} 个文件`);
    } else {
      message.warning(`上传完成：成功 ${success} 个，失败 ${failed} 个`);
    }
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: '24px' }}>
        <TabPane tab="基础上传" key="upload" />
        <TabPane tab="高级上传" key="advanced" />
        <TabPane tab="Prime上传" key="prime" />
        <TabPane tab="MUI上传" key="mui" />
        <TabPane tab="上传任务" key="tasks" />
        <TabPane tab="文件列表" key="list" />
      </Tabs>

      {activeTab === 'upload' && (
        <Card title="文件上传" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
          <div style={{ marginBottom: '24px' }}>
            <FileUploader
              multiple={true}
              accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
              maxSize={5 * 1024 * 1024 * 1024}
              onUploadStart={handleUploadStart}
              onUploadProgress={handleUploadProgress}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '24px' }}>
            <div style={{ padding: '12px 24px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 500, color: '#52c41a' }}>支持格式</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                txt, pdf, doc, docx, xls, xlsx, ppt, pptx, zip, rar, jpg, jpeg, png, gif, safetensors
              </p>
            </div>
            <div style={{ padding: '12px 24px', backgroundColor: '#fff7e6', border: '1px solid #ffe58f', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 500, color: '#fa8c16' }}>文件大小</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>最大 5GB</p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'advanced' && (
        <Card title="高级文件上传（自动上传）" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
          <AdvancedUploader
            multiple={true}
            accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
            maxFileSize={5 * 1024 * 1024 * 1024}
            maxFiles={20}
            autoUpload={true}
            onUploadStart={handleAdvancedUploadStart}
            onUploadProgress={handleAdvancedUploadProgress}
            onUploadSuccess={handleAdvancedUploadSuccess}
            onUploadError={handleAdvancedUploadError}
            onAllUploadComplete={handleAdvancedUploadComplete}
          />
        </Card>
      )}

      {activeTab === 'prime' && (
        <Card title="PrimeVue风格上传（手动上传）" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
          <PrimeAdvancedUploader
            multiple={true}
            accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
            maxFileSize={5 * 1024 * 1024 * 1024}
            maxFiles={20}
            onUploadStart={handleAdvancedUploadStart}
            onUploadProgress={handleAdvancedUploadProgress}
            onUploadSuccess={handleAdvancedUploadSuccess}
            onUploadError={handleAdvancedUploadError}
            onAllUploadComplete={handleAdvancedUploadComplete}
          />
        </Card>
      )}

      {activeTab === 'mui' && (
        <>
          <Card title="MUI风格单行紧凑上传" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)', marginBottom: '24px' }}>
            <div style={{ padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <MuiCompactUploader
                multiple={true}
                accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
                maxFileSize={5 * 1024 * 1024 * 1024}
                maxFiles={20}
                onUploadStart={handleAdvancedUploadStart}
                onUploadProgress={handleAdvancedUploadProgress}
                onUploadSuccess={handleAdvancedUploadSuccess}
                onUploadError={handleAdvancedUploadError}
                onAllUploadComplete={handleAdvancedUploadComplete}
              />
            </div>
          </Card>

          <Card title="MUI风格经典上传" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
            <div style={{ padding: '24px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <MuiNativeUploader
                multiple={true}
                accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
                maxFileSize={5 * 1024 * 1024 * 1024}
                maxFiles={20}
                onUploadStart={handleAdvancedUploadStart}
                onUploadProgress={handleAdvancedUploadProgress}
                onUploadSuccess={handleAdvancedUploadSuccess}
                onUploadError={handleAdvancedUploadError}
                onAllUploadComplete={handleAdvancedUploadComplete}
              />
            </div>
          </Card>
        </>
      )}

      {activeTab === 'tasks' && (
        <UploadTaskList
          tasks={uploadTasks}
          onCancel={handleCancel}
          onRemove={handleRemove}
          onRetry={handleRetry}
        />
      )}

      {activeTab === 'list' && (
        <Card title="文件列表" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
          <FileList
            status="ALL"
            pageSize={10}
            onFileClick={handleFileClick}
            onStatusChange={handleFileStatusChange}
          />
        </Card>
      )}

      {/* 右上角可拖拽悬浮上传框 */}
      <DraggableFloatingBox
        uploadTasks={uploadTasks}
        onCancel={handleCancel}
        onRemove={handleRemove}
        onRetry={handleRetry}
        onFileClick={handleFileClick}
        onStatusChange={handleFileStatusChange}
        onOpenUpload={handleOpenUpload}
      />
    </div>
  );
};

export default FileUploadDemo;