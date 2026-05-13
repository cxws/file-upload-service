import { useState, useCallback } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadFile } from '../api/fileApi';

/**
 * 通用文件上传组件
 * 支持拖拽上传、点击上传、进度显示等功能
 *
 * @param {Object} props
 * @param {boolean} [props.multiple=false] - 是否支持多选
 * @param {string} [props.accept] - 接受的文件类型
 * @param {number} [props.maxSize] - 文件最大大小（字节）
 * @param {string} [props.targetPath] - 目标存储路径
 * @param {string} [props.description] - 文件描述
 * @param {boolean} [props.overwrite=false] - 是否覆盖同名文件
 * @param {Function} [props.onUploadStart] - 上传开始回调
 * @param {Function} [props.onUploadProgress] - 上传进度回调
 * @param {Function} [props.onUploadSuccess] - 上传成功回调
 * @param {Function} [props.onUploadError] - 上传失败回调
 * @param {Object} [props.style] - 组件样式
 */
const FileUploader = ({
  multiple = false,
  accept,
  maxSize,
  targetPath,
  description,
  overwrite = false,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  style = {},
}) => {
  const [uploading, setUploading] = useState(false);

  /**
   * 处理文件上传
   */
  const handleUpload = useCallback(async (file) => {
    // 检查文件大小
    if (maxSize && file.size > maxSize) {
      const errorMsg = `文件大小超出限制（最大 ${formatFileSize(maxSize)}）`;
      message.error(errorMsg);
      onUploadError?.({ fileName: file.name, error: errorMsg });
      return false;
    }

    setUploading(true);

    try {
      // 先上传文件到临时目录并获取任务ID
      const result = await uploadFile(file, {
        targetPath,
        description,
        overwrite,
        onProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onUploadProgress?.({
            fileName: file.name,
            percent,
            loaded: progressEvent.loaded,
            total: progressEvent.total,
          });
        },
      });

      // 立即更新任务为PENDING状态并传入文件ID
      onUploadStart?.({ fileName: file.name, fileSize: file.size, fileId: result.id });

      message.success(`文件已提交处理：${file.name}`);
      
      // 不需要立即标记为COMPLETED，让轮询去处理状态更新
      
      return true;
    } catch (error) {
      const errorMsg = error.message || `文件上传失败：${file.name}`;
      message.error(errorMsg);
      onUploadError?.({
        fileName: file.name,
        error: errorMsg,
      });
      return false;
    } finally {
      setUploading(false);
    }
  }, [targetPath, description, overwrite, onUploadStart, onUploadProgress, onUploadSuccess, onUploadError, maxSize]);

  /**
   * 自定义上传逻辑
   */
  const customRequest = ({ file, onSuccess, onError }) => {
    handleUpload(file).then((success) => {
      if (success) {
        onSuccess(null, file);
      } else {
        onError(new Error('上传失败'));
      }
    });
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 文件列表渲染（隐藏默认列表）
   */
  const fileListRender = () => null;

  return (
    <Upload
      customRequest={customRequest}
      fileList={[]}
      listType="picture-card"
      multiple={multiple}
      accept={accept}
      showUploadList={false}
      disabled={uploading}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          border: '2px dashed #d9d9d9',
          borderRadius: '8px',
          backgroundColor: '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s',
          minHeight: '200px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#1890ff';
          e.currentTarget.style.backgroundColor = '#f0f7ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d9d9d9';
          e.currentTarget.style.backgroundColor = '#fafafa';
        }}
      >
        <UploadOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333', fontWeight: 500 }}>
          {multiple ? '点击或拖拽文件到此处上传' : '点击或拖拽文件到此处上传'}
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
          {accept && <span>支持格式：{accept} </span>}
          {maxSize && <span>最大文件大小：{formatFileSize(maxSize)}</span>}
        </p>
        {uploading && (
          <p style={{ margin: '16px 0 0 0', fontSize: '14px', color: '#1890ff', fontWeight: 500 }}>
            上传中...
          </p>
        )}
      </div>
    </Upload>
  );
};

export default FileUploader;
