import axios from 'axios';

/**
 * 文件上传API封装
 * 提供通用的文件上传、查询、状态查询和取消等操作
 */

// 创建axios实例
const api = axios.create({
  baseURL: '/api/files',
  timeout: 60000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 统一处理响应格式
    if (response.data && response.data.success !== undefined) {
      if (response.data.success) {
        return response.data.data;
      } else {
        return Promise.reject(new Error(response.data.message || '操作失败'));
      }
    }
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 上传单个文件（支持取消和进度回调）
 * @param {File} file - 文件对象
 * @param {Object} options - 上传选项
 * @param {string} [options.targetPath] - 目标路径
 * @param {string} [options.description] - 文件描述
 * @param {boolean} [options.overwrite=false] - 是否覆盖
 * @param {Function} [options.onProgress] - 进度回调
 * @param {AbortSignal} [options.signal] - AbortController.signal 用于取消
 * @returns {Promise<Object>} 文件信息
 */
export const uploadFile = async (file, options = {}) => {
  const { signal, onProgress, ...otherOptions } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 设置超时
    xhr.timeout = 60000;

    // 进度回调
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100)
          });
        }
      });
    }

    // 请求完成回调
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.message || '上传失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      } else {
        reject(new Error(`上传失败: ${xhr.status}`));
      }
    });

    // 错误回调
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });

    // 中止回调
    xhr.addEventListener('abort', () => {
      reject(new DOMException('上传已取消', 'AbortError'));
    });

    // 超时回调
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时'));
    });

    // 监听 abort 信号
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    // 构建 FormData
    const formData = new FormData();
    formData.append('file', file);

    if (otherOptions.targetPath) {
      formData.append('targetPath', otherOptions.targetPath);
    }
    if (otherOptions.description) {
      formData.append('description', otherOptions.description);
    }
    if (otherOptions.overwrite !== undefined) {
      formData.append('overwrite', otherOptions.overwrite.toString());
    }

    // 发送请求
    xhr.open('POST', '/api/files/upload');
    xhr.send(formData);
  });
};

/**
 * 批量上传文件
 * @param {File[]} files - 文件数组
 * @param {Object} options - 上传选项
 * @param {string} [options.targetPath] - 目标路径
 * @param {string} [options.description] - 文件描述
 * @param {boolean} [options.overwrite=false] - 是否覆盖
 * @returns {Promise<Object[]>} 文件信息列表
 */
export const uploadFiles = async (files, options = {}) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  if (options.targetPath) {
    formData.append('targetPath', options.targetPath);
  }
  if (options.description) {
    formData.append('description', options.description);
  }
  if (options.overwrite !== undefined) {
    formData.append('overwrite', options.overwrite.toString());
  }

  return await api.post('/upload/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: options.onProgress,
  });
};

/**
 * 查询文件列表
 * @param {Object} params - 查询参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=20] - 每页大小
 * @param {string} [params.status] - 状态筛选
 * @param {string} [params.fileName] - 文件名搜索
 * @param {string} [params.sortBy='createdAt'] - 排序字段
 * @param {string} [params.sortDirection='DESC'] - 排序方向
 * @returns {Promise<Object>} 文件列表响应
 */
export const getFileList = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined) {
    queryParams.append('page', params.page);
  }
  if (params.size !== undefined) {
    queryParams.append('size', params.size);
  }
  if (params.status) {
    queryParams.append('status', params.status);
  }
  if (params.fileName) {
    queryParams.append('fileName', params.fileName);
  }
  if (params.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params.sortDirection) {
    queryParams.append('sortDirection', params.sortDirection);
  }

  return await api.get(`/list?${queryParams.toString()}`);
};

/**
 * 获取文件详情
 * @param {string} fileId - 文件ID
 * @returns {Promise<Object>} 文件信息
 */
export const getFileInfo = async (fileId) => {
  return await api.get(`/${fileId}`);
};

/**
 * 获取上传状态
 * @param {string} fileId - 文件ID
 * @returns {Promise<Object>} 上传状态
 */
export const getUploadStatus = async (fileId) => {
  return await api.get(`/${fileId}/status`);
};

/**
 * 批量获取上传状态
 * @param {string[]} fileIds - 文件ID列表
 * @returns {Promise<Object[]>} 上传状态列表
 */
export const getUploadStatuses = async (fileIds) => {
  return await api.post('/status/batch', fileIds);
};

/**
 * 取消上传
 * @param {string} fileId - 文件ID
 * @returns {Promise<boolean>} 是否取消成功
 */
export const cancelUpload = async (fileId) => {
  return await api.post(`/${fileId}/cancel`);
};

/**
 * 删除文件
 * @param {string} fileId - 文件ID
 * @returns {Promise<boolean>} 是否删除成功
 */
export const deleteFile = async (fileId) => {
  return await api.delete(`/${fileId}`);
};

/**
 * 批量删除文件
 * @param {string[]} fileIds - 文件ID列表
 * @returns {Promise<number>} 删除成功的数量
 */
export const deleteFiles = async (fileIds) => {
  return await api.delete('/batch', { data: fileIds });
};

/**
 * 重试上传失败的文件
 * @param {string} fileId - 文件ID
 * @returns {Promise<Object>} 文件信息
 */
export const retryUpload = async (fileId) => {
  return await api.post(`/${fileId}/retry`);
};

// 导出所有API方法
export default {
  uploadFile,
  uploadFiles,
  getFileList,
  getFileInfo,
  getUploadStatus,
  getUploadStatuses,
  cancelUpload,
  deleteFile,
  deleteFiles,
  retryUpload,
};
