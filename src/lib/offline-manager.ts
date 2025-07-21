interface QueuedRequest {
  id: string;
  type: 'ai-analysis';
  payload: any;
}

export const offlineManager = {
  isOnline: () => navigator.onLine,

  queueRequest: (request: Omit<QueuedRequest, 'id'>): QueuedRequest => {
    const newRequest: QueuedRequest = {
      ...request,
      id: new Date().toISOString(),
    };
    const queue = offlineManager.getQueue();
    queue.push(newRequest);
    localStorage.setItem('offline-queue', JSON.stringify(queue));
    return newRequest;
  },

  getQueue: (): QueuedRequest[] => {
    const queueJson = localStorage.getItem('offline-queue');
    return queueJson ? JSON.parse(queueJson) : [];
  },

  processQueue: async (processor: (request: QueuedRequest) => Promise<boolean>) => {
    if (!offlineManager.isOnline()) {
      return;
    }

    let queue = offlineManager.getQueue();
    if (queue.length === 0) {
      return;
    }

    const processedIds = new Set<string>();

    for (const request of queue) {
      const success = await processor(request);
      if (success) {
        processedIds.add(request.id);
      }
    }

    // Remove processed requests from the queue
    queue = queue.filter((request) => !processedIds.has(request.id));
    localStorage.setItem('offline-queue', JSON.stringify(queue));
  },

  saveCapturedImage: (image: { dataUrl: string, timestamp: Date }): void => {
    const images = offlineManager.getCapturedImages();
    images.unshift(image);
    localStorage.setItem('captured-images', JSON.stringify(images));
  },

  getCapturedImages: (): { dataUrl: string, timestamp: Date }[] => {
    const imagesJson = localStorage.getItem('captured-images');
    return imagesJson ? JSON.parse(imagesJson) : [];
  },
};
