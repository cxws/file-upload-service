import { useState, useCallback } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Typography, Snackbar, Alert } from '@mui/material';
import FileUploader from './FileUploader';
import FileList from './FileList';
import UploadTaskList from './UploadTaskList';
import AdvancedUploader from './AdvancedUploader';
import PrimeAdvancedUploader from './PrimeAdvancedUploader';
import MuiNativeUploader from './MuiNativeUploader';
import MuiCompactUploader from './MuiCompactUploader';
import DraggableFloatingBox from './DraggableFloatingBox';
import { uploadFiles } from '../api/fileApi';

/**
 * MUI版本文件上传演示组件
 * 使用纯 Material UI 组件，不使用 Ant Design
 */
const MuiFileUploadDemo = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [uploadTasks, setUploadTasks] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showMessage = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  /**
   * 处理打开上传页面
   */
  const handleOpenUpload = useCallback(() => {
    setActiveTab(0);
  }, []);

  /**
   * 处理文件上传开始
   */
  const handleUploadStart = useCallback(({ fileName, fileSize, fileId }) => {
    const newTask = {
      id: fileId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      size: fileSize,
      status: 'PENDING',
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
      status: 'PENDING',
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
    showMessage(`点击文件：${file.originalFileName}`, 'info');
  }, [showMessage]);

  /**
   * 处理高级上传开始
   */
  const handleAdvancedUploadStart = useCallback(({ fileId, fileName, fileSize }) => {
    const newTask = {
      id: fileId,
      name: fileName,
      size: fileSize,
      status: 'PENDING',
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
      showMessage(`全部上传成功！共 ${success} 个文件`, 'success');
    } else {
      showMessage(`上传完成：成功 ${success} 个，失败 ${failed} 个`, 'warning');
    }
  }, [showMessage]);

  const tabLabels = [
    '基础上传',
    '高级上传',
    'Prime上传',
    'MUI上传',
    '上传任务',
    '文件列表',
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* 标签页导航 */}
      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)} 
        sx={{ mb: 3 }}
      >
        {tabLabels.map((label, index) => (
          <Tab key={index} label={label} />
        ))}
      </Tabs>

      {/* 标签页内容 */}
      {activeTab === 0 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 3 }}>
              文件上传
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <FileUploader
                multiple={true}
                accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
                maxSize={5 * 1024 * 1024 * 1024}
                onUploadStart={handleUploadStart}
                onUploadProgress={handleUploadProgress}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#52c41a', mb: 0.5 }}>
                  支持格式
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  txt, pdf, doc, docx, xls, xlsx, ppt, pptx, zip, rar, jpg, jpeg, png, gif, safetensors
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#fa8c16', mb: 0.5 }}>
                  文件大小
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  最大 5GB
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
              高级文件上传（自动上传）
            </Typography>
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
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
              PrimeVue风格上传（手动上传）
            </Typography>
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
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                MUI风格单行紧凑上传
              </Typography>
              <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
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
              </Box>
            </CardContent>
          </Card>

          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                MUI风格经典上传
              </Typography>
              <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
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
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 4 && (
        <UploadTaskList
          tasks={uploadTasks}
          onCancel={handleCancel}
          onRemove={handleRemove}
          onRetry={handleRetry}
        />
      )}

      {activeTab === 5 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
              文件列表
            </Typography>
            <FileList
              status="ALL"
              pageSize={10}
              onFileClick={handleFileClick}
              onStatusChange={handleFileStatusChange}
            />
          </CardContent>
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

      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MuiFileUploadDemo;
