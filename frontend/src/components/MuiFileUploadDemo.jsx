import { useState } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Typography, Paper } from '@mui/material';
import FileUploader from './FileUploader';
import FileList from './FileList';
import UploadTaskList from './UploadTaskList';
import AdvancedUploader from './AdvancedUploader';
import PrimeAdvancedUploader from './PrimeAdvancedUploader';
import MuiNativeUploader from './MuiNativeUploader';
import MuiCompactUploader from './MuiCompactUploader';
import AsyncUploadPanel from './AsyncUploadPanel';

/**
 * MUI版本文件上传演示组件
 * 使用纯 Material UI 组件
 */
const MuiFileUploadDemo = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabLabels = [
    '基础上传',
    '高级上传',
    'Prime上传',
    'MUI上传',
    '异步上传',
    '上传任务',
    '文件列表',
  ];

  return (
    <Box sx={{ p: 0 }}>
      {/* 标签页导航 */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      </Paper>

      {/* 标签页内容 */}
      {activeTab === 0 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 3 }}>
              文件上传
            </Typography>
            <FileUploader
              multiple={true}
              accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
              maxSize={5 * 1024 * 1024 * 1024}
            />
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
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <MuiCompactUploader
                  multiple={true}
                  accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
                  maxFileSize={5 * 1024 * 1024 * 1024}
                  maxFiles={20}
                />
              </Box>
            </CardContent>
          </Card>

          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                MUI风格经典上传
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <MuiNativeUploader
                  multiple={true}
                  accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.safetensors"
                  maxFileSize={5 * 1024 * 1024 * 1024}
                  maxFiles={20}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 4 && (
        <Card elevation={1}>
          <CardContent sx={{ p: 0 }}>
            <AsyncUploadPanel />
          </CardContent>
        </Card>
      )}

      {activeTab === 5 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
              上传任务列表
            </Typography>
            <UploadTaskList />
          </CardContent>
        </Card>
      )}

      {activeTab === 6 && (
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
              文件列表
            </Typography>
            <FileList />
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MuiFileUploadDemo;
