import { useState, useCallback, useEffect, useRef } from 'react';
import { uploadQueue } from '../utils/AsyncUploadQueue';
import { uploadFile } from '../api/fileApi';

export const useAsyncUpload = (options = {}) => {
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

  const addFiles = useCallback(async (files) => {
    const newTaskIds = [];

    for (const file of files) {
      const taskId = uploadQueue.addTask(file, options);
      newTaskIds.push(taskId);

      try {
        await performUpload(taskId, file);
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error);
      }
    }

    return newTaskIds;
  }, [options]);

  const performUpload = useCallback(async (taskId, file) => {
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
    } catch (error) {
      if (error.name === 'AbortError') {
        uploadQueue.cancelTask(taskId);
      } else {
        uploadQueue.failTask(taskId, error);
      }
    }
  }, []);

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
    uploadQueue.retryTask(taskId);
  }, []);

  const pauseAll = useCallback(() => {
    uploadQueue.pauseAll();
    setIsPaused(true);
  }, []);

  const resumeAll = useCallback(() => {
    uploadQueue.resumeAll();
    setIsPaused(false);
  }, []);

  const clearCompleted = useCallback(() => {
    uploadQueue.clearCompleted();
  }, []);

  const clearAll = useCallback(() => {
    uploadQueue.clearAll();
  }, []);

  return {
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
};

export default useAsyncUpload;
