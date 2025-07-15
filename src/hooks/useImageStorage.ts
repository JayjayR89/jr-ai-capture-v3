import { useState, useCallback, useEffect, useRef } from 'react';

interface StoredImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
  description?: string;
}

interface UseImageStorageOptions {
  maxImages?: number;
  compressionQuality?: number;
}

export const useImageStorage = (options: UseImageStorageOptions = {}) => {
  const { maxImages = 50, compressionQuality = 0.7 } = options;
  const [images, setImages] = useState<StoredImage[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const isMountedRef = useRef(true);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      imageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  const addImage = useCallback((dataUrl: string, description?: string) => {
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create blob URL for memory efficiency
    const blob = dataURLToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);
    
    if (!isMountedRef.current) {
      URL.revokeObjectURL(blobUrl);
      return id;
    }
    
    setImageUrls(prev => {
      const newMap = new Map(prev);
      newMap.set(id, blobUrl);
      return newMap;
    });

    setImages(prev => {
      const newImage: StoredImage = {
        id,
        dataUrl: dataUrl, // Keep original for export functionality
        timestamp: new Date(),
        description
      };
      
      // Limit memory usage
      const updated = [newImage, ...prev];
      if (updated.length > maxImages) {
        const removed = updated.pop();
        if (removed) {
          // Get the URL from the current imageUrls state
          const currentUrl = imageUrls.get(removed.id);
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
        }
      }
      return updated;
    });

    return id;
  }, [maxImages, imageUrls]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setImageUrls(prev => {
      const newMap = new Map(prev);
      const url = newMap.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        newMap.delete(id);
      }
      return newMap;
    });
  }, []);

  const clearImages = useCallback(() => {
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    setImageUrls(new Map());
    setImages([]);
  }, [imageUrls]);

  const getImageUrl = useCallback((id: string) => {
    return imageUrls.get(id) || '';
  }, [imageUrls]);

  const updateImageDescription = useCallback((id: string, description: string) => {
    setImages(prev => 
      prev.map(img => 
        img.id === id ? { ...img, description } : img
      )
    );
  }, []);

  return {
    images,
    addImage,
    removeImage,
    clearImages,
    getImageUrl,
    updateImageDescription
  };
};

// Helper function to convert data URL to blob
function dataURLToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}