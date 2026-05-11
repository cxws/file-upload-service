import { Box, Paper, Typography } from '@mui/material';
import { AsyncUploadProvider } from './context/AsyncUploadContext';
import AsyncUploadPanel from './components/AsyncUploadPanel';
import MuiFileUploadDemo from './components/MuiFileUploadDemo';

function App() {
  return (
    <AsyncUploadProvider>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper
          elevation={2}
          square
          sx={{
            p: 3,
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 600 }}>
            文件上传服务
          </Typography>
        </Paper>

        {/* Content */}
        <Box sx={{ flex: 1, maxWidth: '1200px', width: '100%', mx: 'auto', p: 3 }}>
          {/* 异步上传面板 */}
          <Box sx={{ mb: 3 }}>
            <AsyncUploadPanel />
          </Box>

          {/* 其他上传组件 */}
          <MuiFileUploadDemo />
        </Box>

        {/* Footer */}
        <Box sx={{ p: 3, textAlign: 'center', color: '#999', borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2">
            文件上传组件演示 ©2024
          </Typography>
        </Box>
      </Box>
    </AsyncUploadProvider>
  );
}

export default App;
