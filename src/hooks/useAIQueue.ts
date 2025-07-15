import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface QueueItem {
  id: string;
  dataUrl: string;
  timestamp: Date;
  retryCount: number;
}

type FallbackHandler = (dataUrl: string) => Promise<string>;

interface UseAIQueueOptions {
  maxConcurrent?: number;
  retryLimit?: number;
  rateLimitDelay?: number;
  fallbackEnabled?: boolean;
  fallbackHandler?: FallbackHandler;
  onError?: (error: Error, item: QueueItem) => void;
}

interface UseAIQueueReturn {
  queue: QueueItem[];
  addToQueue: (dataUrl: string) => void;
  isProcessing: boolean;
  processedCount: number;
  errorCount: number;
  hasFallback: boolean;
}

export const useAIQueue = (
  processFn: (dataUrl: string) => Promise<string>,
  options: UseAIQueueOptions = {}
): UseAIQueueReturn => {
  const {
    maxConcurrent = 1,
    retryLimit = 3,
    rateLimitDelay = 1000,
    fallbackEnabled = true,
    fallbackHandler,
    onError
  } = options;

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [hasFallback, setHasFallback] = useState(false);

  const processingRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const addToQueue = useCallback((dataUrl: string) => {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: QueueItem = {
      id,
      dataUrl,
      timestamp: new Date(),
      retryCount: 0
    };
    
    setQueue(prev => [...prev, newItem]);
  }, []);

  const processNext = useCallback(async () => {
    if (processingRef.current.size >= maxConcurrent) return;

    const nextItem = queue.find(item => !processingRef.current.has(item.id));
    if (!nextItem) return;

    let fallbackUsed = false;
    processingRef.current.add(nextItem.id);
    setIsProcessing(true);

    try {
      const result = await processFn(nextItem.dataUrl);
      
      if (!isMountedRef.current) return;
      setHasFallback(false);
      
      setQueue(prev => prev.filter(item => item.id !== nextItem.id));
      setProcessedCount(prev => prev + 1);
      
      // Rate limiting
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          processingRef.current.delete(nextItem.id);
          processNext();
        }
      }, rateLimitDelay);
      
    } catch (error) {
      console.error('AI processing error:', error);
      
      if (!isMountedRef.current) return;
      
      // Handle fallback logic
      if (fallbackEnabled && !fallbackUsed && fallbackHandler && nextItem.retryCount === 0) {
        fallbackUsed = true;
        setHasFallback(true);
        
        try {
          const fallbackResult = await fallbackHandler(nextItem.dataUrl);
          
          if (!isMountedRef.current) return;
          
          // Show fallback notification
          toast({
            title: "AI Service Unavailable",
            description: "Using fallback processing. Results may be limited.",
            variant: "default",
            duration: 3000
          });
          
          setQueue(prev => prev.filter(item => item.id !== nextItem.id));
          setProcessedCount(prev => prev + 1);
          
          if (onError) {
            onError(error as Error, nextItem);
          }
          
          processingRef.current.delete(nextItem.id);
          return;
        } catch (fallbackError) {
          console.error('Fallback processing also failed:', fallbackError);
          // Continue to retry logic if fallback fails
        }
      }
      
      setQueue(prev => {
        const updated = prev.map(item => {
          if (item.id === nextItem.id) {
            return { ...item, retryCount: item.retryCount + 1 };
          }
          return item;
        });
        
        // Remove if retry limit exceeded
        return updated.filter(item =>
          item.id !== nextItem.id || item.retryCount < retryLimit
        );
      });
      
      setErrorCount(prev => prev + 1);
      
      if (onError) {
        onError(error as Error, nextItem);
      }
      
      processingRef.current.delete(nextItem.id);
      
      // Continue processing
      setTimeout(() => {
        if (isMountedRef.current) {
          processNext();
        }
      }, rateLimitDelay);
    }
  }, [queue, processFn, maxConcurrent, retryLimit, rateLimitDelay, fallbackEnabled, fallbackHandler, onError]);

  useEffect(() => {
    if (queue.length > 0 && processingRef.current.size < maxConcurrent) {
      processNext();
    } else if (queue.length === 0 && processingRef.current.size === 0) {
      setIsProcessing(false);
    }
  }, [queue, processNext, maxConcurrent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    queue: queue.filter(item => !processingRef.current.has(item.id)),
    addToQueue,
    isProcessing,
    processedCount,
    errorCount,
    hasFallback
  };
};