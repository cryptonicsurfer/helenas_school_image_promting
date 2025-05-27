import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export interface ImageEntry {
  id: string;
  userId: string;
  originalPrompt: string;
  enhancedPrompt: string;
  imageDataUri: string;
  thumbsUp: number;
  thumbsDown: number;
  createdAt: Timestamp;
}

export const addImage = async (imageData: Omit<ImageEntry, "id" | "thumbsUp" | "thumbsDown" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "images"), {
      ...imageData,
      thumbsUp: 0,
      thumbsDown: 0,
      createdAt: Timestamp.now(),
    });
    console.log("[firestoreService] Image added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[firestoreService] Error adding image to Firestore: ", error);
    throw error;
  }
};

export const getImages = (callback: (images: ImageEntry[]) => void) => {
  const q = query(collection(db, "images"), orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(q, 
    (querySnapshot) => {
      const images: ImageEntry[] = [];
      querySnapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        images.push({ id: docSnap.id, ...docSnap.data() } as ImageEntry);
      });
      console.log('[firestoreService] Fetched images:', images.length > 0 ? `${images.length} images` : 'No images found');
      callback(images);
    },
    (error) => {
      console.error("[firestoreService] Error fetching images via onSnapshot:", error);
      // Call callback with empty array to ensure UI can update (e.g. stop loading state)
      callback([]); 
    }
  );
  return unsubscribe; // Return the unsubscribe function to clean up the listener
};

export const rateImage = async (imageId: string, ratingType: "thumbsUp" | "thumbsDown") => {
  try {
    const imageRef = doc(db, "images", imageId);
    await updateDoc(imageRef, {
      [ratingType]: increment(1),
    });
    console.log(`[firestoreService] Image ${imageId} rated ${ratingType}`);
  } catch (error) {
    console.error("[firestoreService] Error rating image: ", error);
    throw error;
  }
};
