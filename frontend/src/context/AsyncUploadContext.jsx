import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { uploadQueue } from '../utils/AsyncUploadQueue';
import { uploadFile } from '../api/fileApi';

const AsyncUploadContext = createContext(null);

export const useAsyncUploadContext = () => {
  const context = useContext(AsyncUploadContext);
  if (!context) {
    throw new Error('useAsyncUploadContext must be used within AsyncUploadProvider');
  }
  return context;
};

export const AsyncUploadProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [queueStatus, setQueueStatus] = useState(uploadQueue.getQueueStatus());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const unsubscribe = uploadQueue.subscribe((event, data) => {
      if (!isMounted.current) return;

      switch (event) {
        case 'TASK_ADDED':
        case 'TASK_STARTED':
        case 'TASK_PROGRESS':
        case 'TASK_COMPLETED':
        case 'TASK_FAILED':
        case 'TASK_CANCELLED':
        case 'TASK_PAUSED':
        case 'TASK_RESUMED':
        case 'TASK_RETRY':
          setTasks(uploadQueue.getAllTasks());
          break;
        case 'QUEUE_PAUSED':
        case 'QUEUE_RESUMED':
          setIsPaused(uploadQueue.paused);
          break;
        case 'QUEUE_CLEANED':
        case 'QUEUE_CLEARED':
          setTasks(uploadQueue.getAllTasks());
          break;
        default:
          break;
      }

      setQueueStatus(uploadQueue.getQueueStatus());
    });

    setTasks(uploadQueue.getAllTasks());
    setIsPaused(uploadQueue.paused);

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const performUpload = useCallback(async (taskId, file, uploadOptions) => {
    const task = uploadQueue.getAllTasks().find(t => t.id === taskId);
    if (!task) return;

    try {
      const result = await uploadFile(file, {
        onProgress: (progressEvent) => {
          uploadQueue.updateProgress(taskId, {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
          });
        },
        signal: task.abortController?.signal,
      });

      uploadQueue.completeTask(taskId, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        uploadQueue.cancelTask(taskId);
      } else {
        uploadQueue.failTask(taskId, error);
      }
      throw error;
    }
  }, []);

  const addFiles = useCallback(async (files, uploadOptions = {}) => {
    const newTaskIds = [];

    for (const file of files) {
      const taskId = uploadQueue.addTask(file, uploadOptions);
      newTaskIds.push(taskId);

      performUpload(taskId, file, uploadOptions).catch(error => {
        console.error(`Upload error for ${file.name}:`, error);
      });
    }

    return newTaskIds;
  }, [performUpload]);

  const cancelTask = useCallback((taskId) => {
    uploadQueue.cancelTask(taskId);
  }, []);

  const pauseTask = useCallback((taskId) => {
    uploadQueue.pauseTask(taskId);
  }, []);

  const resumeTask = useCallback((taskId) => {
    uploadQueue.resumeTask(taskId);
  }, []);

  const retryTask = useCallback((taskId) => {
    const task = uploadQueue.getAllTasks().find(t => t.id === taskId);
    if (!task) return;

    task.status = 'PENDING';
    task.progress = 0;
    task.loaded = 0;
    task.error = null;
    task.abortController = null;

    uploadQueue.retryTask(taskId);
    performUpload(taskId, task.file, task.uploadOptions).catch(error => {
      console.error(`Retry upload error for ${task.fileName}:`, error);
    });
  }, [performUpload]);

  const pauseAll = useCallback(() => {
    uploadQueue.pauseAll();
    setIsPaused(true);
  }, []);

  const resumeAll = useCallback(() => {
    const pausedTasks = uploadQueue.getAllTasks().filter(t => t.status === 'PAUSED');

    uploadQueue.resumeAll();
    setIsPaused(false);

    pausedTasks.forEach(task => {
      performUpload(task.id, task.file, task.uploadOptions).catch(error => {
        console.error(`Resume upload error for ${task.fileName}:`, error);
      });
    });
  }, [performUpload]);

  const clearCompleted = useCallback(() => {
    uploadQueue.clearCompleted();
  }, []);

  const clearAll = useCallback(() => {
    uploadQueue.clearAll();
  }, []);

  const value = {
    tasks,
    queueStatus,
    isPaused,
    addFiles,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    pauseAll,
    resumeAll,
    clearCompleted,
    clearAll,
  };

  return (
    <AsyncUploadContext.Provider value={value}>
      {children}
    </AsyncUploadContext.Provider>
  );
};

export default AsyncUploadContext;
