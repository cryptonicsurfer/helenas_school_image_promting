// src/services/imageService.ts
import { addImage, getImages, rateImage, type ImageEntry, type NewImagePayload } from '@/lib/database';

// För kompatibilitet med din befintliga kod
export { type ImageEntry };

export type { NewImagePayload };

// Real-time updates using EventSource (för frontend)
const eventListeners = new Set<(images: ImageEntry[]) => void>();

export const addImageToDatabase = async (imageData: NewImagePayload): Promise<string> => {
  const imageId = addImage(imageData);
  
  // Notify all listeners about the new image
  notifyListeners();
  
  return imageId;
};

export const getAllImages = (): ImageEntry[] => {
  return getImages();
};

export const submitRating = async (imageId: string, userId: string, ratingType: 'thumbs_up' | 'thumbs_down'): Promise<void> => {
  rateImage(imageId, userId, ratingType);
  
  // Notify all listeners about the rating update
  notifyListeners();
};

// Compatibility functions for your existing code
export const getImagesRealtime = (callback: (images: ImageEntry[]) => void) => {
  // Initial load
  callback(getAllImages());
  
  // Add to listeners for updates
  eventListeners.add(callback);
  
  // Return unsubscribe function
  return () => {
    eventListeners.delete(callback);
  };
};

const notifyListeners = () => {
  const images = getAllImages();
  eventListeners.forEach(callback => {
    try {
      callback(images);
    } catch (error) {
      console.error('Error in image listener:', error);
    }
  });
};

// Export compatibility functions with same names as your Supabase service
export const addImageCompatible = addImageToDatabase;
export const rateImageCompatible = submitRating;