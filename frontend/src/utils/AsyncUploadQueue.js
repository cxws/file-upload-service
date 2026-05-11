class AsyncUploadQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.queue = [];
    this.activeTasks = new Map();
    this.paused = false;
    this.listeners = new Set();
    this.speedCalculators = new Map();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addTask(file, uploadOptions = {}) {
    const taskId = this.generateTaskId();

    const task = {
      id: taskId,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'PENDING',
      progress: 0,
      speed: 0,
      remainingTime: null,
      loaded: 0,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      uploadOptions,
      abortController: null,
    };

    this.queue.push(task);
    this.notify('TASK_ADDED', task);
    this.processQueue();

    return taskId;
  }

  processQueue() {
    if (this.paused) return;

    while (
      this.activeTasks.size < this.maxConcurrent &&
      this.queue.length > 0
    ) {
      const nextTask = this.queue.find(t => t.status === 'PENDING');
      if (!nextTask) break;

      this.startTask(nextTask);
    }
  }

  async startTask(task) {
    task.status = 'UPLOADING';
    task.startedAt = Date.now();
    task.abortController = new AbortController();

    this.activeTasks.set(task.id, task);
    this.speedCalculators.set(task.id, {
      lastLoaded: 0,
      lastTime: Date.now(),
      samples: [],
    });

    this.notify('TASK_STARTED', task);
    this.processQueue();
  }

  updateProgress(taskId, progressEvent) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    const { loaded, total } = progressEvent;
    const percent = Math.round((loaded / total) * 100);

    const calculator = this.speedCalculators.get(taskId);
    if (calculator) {
      const now = Date.now();
      const timeDiff = (now - calculator.lastTime) / 1000;

      if (timeDiff >= 0.5) {
        const bytesDiff = loaded - calculator.lastLoaded;
        const speed = bytesDiff / timeDiff;

        calculator.samples.push(speed);
        if (calculator.samples.length > 5) {
          calculator.samples.shift();
        }

        const avgSpeed = calculator.samples.reduce((a, b) => a + b, 0) / calculator.samples.length;
        task.speed = avgSpeed;

        const remainingBytes = total - loaded;
        task.remainingTime = remainingBytes / avgSpeed;

        calculator.lastLoaded = loaded;
        calculator.lastTime = now;
      }
    }

    task.loaded = loaded;
    task.progress = percent;

    this.notify('TASK_PROGRESS', task);
  }

  completeTask(taskId, result) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'COMPLETED';
    task.progress = 100;
    task.completedAt = Date.now();
    task.speed = 0;
    task.remainingTime = 0;

    this.activeTasks.delete(taskId);
    this.speedCalculators.delete(taskId);

    this.notify('TASK_COMPLETED', { ...task, result });
    this.processQueue();
  }

  failTask(taskId, error) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    task.status = 'FAILED';
    task.error = error.message || '上传失败';
    task.completedAt = Date.now();
    task.speed = 0;
    task.remainingTime = null;

    this.activeTasks.delete(taskId);
    this.speedCalculators.delete(taskId);

    this.notify('TASK_FAILED', task);
    this.processQueue();
  }

  cancelTask(taskId) {
    const queueTask = this.queue.find(t => t.id === taskId);
    if (queueTask && queueTask.status === 'PENDING') {
      queueTask.status = 'CANCELLED';
      queueTask.completedAt = Date.now();
      this.notify('TASK_CANCELLED', queueTask);
      return;
    }

    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      if (activeTask.abortController) {
        activeTask.abortController.abort();
      }
      activeTask.status = 'CANCELLED';
      activeTask.completedAt = Date.now();
      this.activeTasks.delete(taskId);
      this.speedCalculators.delete(taskId);
      this.notify('TASK_CANCELLED', activeTask);
      this.processQueue();
    }
  }

  pauseTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task || task.status !== 'UPLOADING') return;

    if (task.abortController) {
      task.abortController.abort();
    }
    task.status = 'PAUSED';
    this.activeTasks.delete(taskId);
    this.speedCalculators.delete(taskId);
    this.notify('TASK_PAUSED', task);
  }

  resumeTask(taskId) {
    const task = this.queue.find(t => t.id === taskId);
    if (!task || task.status !== 'PAUSED') return;

    task.status = 'PENDING';
    task.abortController = null;
    this.notify('TASK_RESUMED', task);
    this.processQueue();
  }

  retryTask(taskId) {
    const task = this.queue.find(t => t.id === taskId);
    if (!task || task.status !== 'FAILED') return;

    task.status = 'PENDING';
    task.progress = 0;
    task.loaded = 0;
    task.error = null;
    task.abortController = null;
    this.notify('TASK_RETRY', task);
    this.processQueue();
  }

  pauseAll() {
    this.paused = true;
    this.activeTasks.forEach(task => {
      if (task.abortController) {
        task.abortController.abort();
      }
      task.status = 'PAUSED';
    });
    this.notify('QUEUE_PAUSED', { tasks: Array.from(this.activeTasks.values()) });
    this.activeTasks.clear();
    this.speedCalculators.clear();
  }

  resumeAll() {
    this.paused = false;
    this.queue.forEach(task => {
      if (task.status === 'PAUSED') {
        task.status = 'PENDING';
      }
    });
    this.notify('QUEUE_RESUMED', { tasks: this.queue.filter(t => t.status === 'PENDING') });
    this.processQueue();
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(t => t.status === 'PENDING').length,
      uploading: Array.from(this.activeTasks.values()).length,
      paused: this.queue.filter(t => t.status === 'PAUSED').length,
      completed: this.queue.filter(t => t.status === 'COMPLETED').length,
      failed: this.queue.filter(t => t.status === 'FAILED').length,
      cancelled: this.queue.filter(t => t.status === 'CANCELLED').length,
      isPaused: this.paused,
    };
  }

  getAllTasks() {
    return [...this.queue];
  }

  getActiveTasks() {
    return Array.from(this.activeTasks.values());
  }

  clearCompleted() {
    this.queue = this.queue.filter(t => t.status !== 'COMPLETED');
    this.notify('QUEUE_CLEANED', { remaining: this.queue.length });
  }

  clearAll() {
    this.queue.forEach(task => {
      if (task.abortController) {
        task.abortController.abort();
      }
    });
    this.queue = [];
    this.activeTasks.clear();
    this.speedCalculators.clear();
    this.notify('QUEUE_CLEARED', {});
  }
}

export const uploadQueue = new AsyncUploadQueue({
  maxConcurrent: 3,
});

export default AsyncUploadQueue;
