// src/services/imageService.ts
import { addImage, getImages, rateImage, type ImageEntry, type NewImagePayload, type ImageSortCriteria, type ImageFilterCriteria } from '@/lib/database';

// För kompatibilitet med din befintliga kod
export { type ImageEntry };

export type { NewImagePayload };

// Real-time updates using EventSource (för frontend)
const eventListeners = new Set<(images: ImageEntry[]) => void>();

export const addImageToDatabase = async (imageData: NewImagePayload): Promise<string> => {
  const imageId = await addImage(imageData); // Await the async call
  
  // Notify all listeners about the new image
  await notifyListeners(); // Await the async call
  
  return imageId;
};

export const getAllImages = async (
  currentUserId?: string,
  sortBy: ImageSortCriteria = 'created_at_desc',
  filterBy: ImageFilterCriteria = 'all'
): Promise<ImageEntry[]> => {
  return await getImages(currentUserId, sortBy, filterBy);
};

export const submitRating = async (imageId: string, userId: string, ratingType: 'thumbs_up' | 'thumbs_down'): Promise<void> => {
  await rateImage(imageId, userId, ratingType); // Await the async call
  
  // Notify all listeners about the rating update
  await notifyListeners(); // Await the async call
};

// Compatibility functions for your existing code
export const getImagesRealtime = (callback: (images: ImageEntry[]) => void) => {
  // Initial load
  getAllImages().then(images => { // Handle promise for initial load
    callback(images);
  }).catch(error => {
    console.error('Error fetching initial images for realtime:', error);
    // Optionally call callback with empty array or handle error state
    // callback([]);
  });
  
  // Add to listeners for updates
  eventListeners.add(callback);
  
  // Return unsubscribe function
  return () => {
    eventListeners.delete(callback);
  };
};

const notifyListeners = async () => { // Make async
  // Notify with default sort order and no specific user/filter for general updates
  // If specific user context is needed for notifications, this might need adjustment
  const images = await getAllImages(undefined, 'created_at_desc', 'all');
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