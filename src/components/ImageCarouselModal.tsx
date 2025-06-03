"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, UserCircle, X } from 'lucide-react';
import type { ImageEntry } from '@/services/imageService'; // ✅ Ändrat från supabaseService
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // ✅ Lägg till för currentUser

interface ImageCarouselModalProps {
  images: ImageEntry[];
  startIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageCarouselModal({ images, startIndex, isOpen, onClose }: ImageCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // State for optimistic updates within the modal
  const [currentOptimisticImage, setCurrentOptimisticImage] = useState<ImageEntry | null>(null);
  const [currentUserVote, setCurrentUserVote] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isRatingInProgress, setIsRatingInProgress] = useState(false);
  const ratingApiCallInProgressRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [startIndex, isOpen]);

  // Effect to update currentOptimisticImage when images or currentIndex change
  useEffect(() => {
    if (isOpen && images.length > 0 && currentIndex < images.length) {
      const activeImage = images[currentIndex];

      // If an optimistic update is in progress for the *current* image ID,
      // do NOT overwrite currentOptimisticImage from the `images` prop.
      if (isRatingInProgress && currentOptimisticImage && activeImage.id === currentOptimisticImage.id) {
        return; // Protect the optimistic state
      }

      setCurrentOptimisticImage({ ...activeImage });
      // Only reset currentUserVote if the image ID actually changes
      if (!currentOptimisticImage || activeImage.id !== currentOptimisticImage.id) {
        setCurrentUserVote(null);
      }
    } else if (isOpen && images.length === 0) {
      onClose();
    } else if (isOpen && currentIndex >= images.length && images.length > 0) {
      // Handle case where currentIndex might be out of bounds after images array changes
      const newIndex = Math.max(0, images.length - 1);
      setCurrentIndex(newIndex); // This will trigger a re-run if index changed
      // If index was out of bounds, the re-run will handle setting the image.
      // We need to be careful not to set state that causes an immediate loop if newIndex === currentIndex.
      // The guard for isRatingInProgress should also apply here if we were to set image directly.
      // However, by only calling setCurrentIndex, we defer to the next effect run.
      // For safety, if we were to set image here, it would need the same protection:
      if (!(isRatingInProgress && currentOptimisticImage && images[newIndex] && images[newIndex].id === currentOptimisticImage.id)) {
         // setCurrentOptimisticImage({ ...images[newIndex] }); // This line is implicitly handled by re-run due to setCurrentIndex
         // setCurrentUserVote(null); // Also handled by re-run
      }
      // The main logic for setting currentOptimisticImage is at the top of this effect,
      // so if setCurrentIndex causes a change, that logic will correctly apply.
    } else if (!isOpen) {
      setCurrentOptimisticImage(null); // Clear when modal is closed
      setCurrentUserVote(null);
    }
  }, [images, currentIndex, isOpen, onClose, isRatingInProgress, currentOptimisticImage]);


  const handleRate = async (ratingType: "thumbs_up" | "thumbs_down") => {
    if (ratingApiCallInProgressRef.current || !currentOptimisticImage || !currentUser) return;

    ratingApiCallInProgressRef.current = true;
    setIsRatingInProgress(true);

    const imageBeforeOptimisticUpdate = { ...currentOptimisticImage };
    const voteBeforeOptimisticUpdate = currentUserVote;

    let newThumbsUp = currentOptimisticImage.thumbs_up;
    let newThumbsDown = currentOptimisticImage.thumbs_down;
    let newOptimisticVoteState: 'thumbs_up' | 'thumbs_down' | null = currentUserVote;
    let hasVoteChanged = false;

    if (ratingType === "thumbs_up") {
      if (currentUserVote !== "thumbs_up") { // If not already thumbs_up, or changing vote
        newOptimisticVoteState = "thumbs_up";
        newThumbsUp = 1;
        newThumbsDown = 0; // Set other to 0
        hasVoteChanged = true;
      }
    } else { // ratingType === "thumbs_down"
      if (currentUserVote !== "thumbs_down") { // If not already thumbs_down, or changing vote
        newOptimisticVoteState = "thumbs_down";
        newThumbsDown = 1;
        newThumbsUp = 0; // Set other to 0
        hasVoteChanged = true;
      }
    }

    if (!hasVoteChanged) {
      ratingApiCallInProgressRef.current = false;
      setIsRatingInProgress(false);
      return;
    }

    const updatedOptimisticImage = {
      ...currentOptimisticImage,
      thumbs_up: newThumbsUp,
      thumbs_down: newThumbsDown,
    };

    setCurrentOptimisticImage(updatedOptimisticImage);
    setCurrentUserVote(newOptimisticVoteState);
    // Note: No onImageUpdate prop like in ImageCard, changes are local to modal. Parent polls.

    try {
      const response = await fetch(`/api/images/${currentOptimisticImage.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratingType }), // Align with ImageCard, userId from session
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to rate image');
      }

      toast({
        title: "Rating Submitted",
        description: `You rated ${ratingType === "thumbs_up" ? "thumbs up" : "thumbs down"}.`,
      });
      // Polling will eventually fetch the true state.
    } catch (error) {
      setCurrentOptimisticImage(imageBeforeOptimisticUpdate); // Revert
      setCurrentUserVote(voteBeforeOptimisticUpdate);      // Revert
      toast({
        title: "Rating Error",
        description: (error as Error).message || "Could not submit your rating.",
        variant: "destructive",
      });
    } finally {
      ratingApiCallInProgressRef.current = false;
      setIsRatingInProgress(false);
    }
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, goToPrevious, goToNext, onClose]);

  if (!isOpen || images.length === 0) {
    return null;
  }

  const displayImage = currentOptimisticImage;

  if (!isOpen) {
    return null; // Modal not open, render nothing.
  }

  if (!displayImage) {
    // Modal is open, but currentOptimisticImage is not yet set.
    // Render the Dialog shell, optionally with a loader.
    // The useEffects should quickly set currentOptimisticImage or close the modal if images are empty.
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl w-[90vw] h-[90vh] p-0 flex items-center justify-center bg-card overflow-hidden">
          {/* Optional: Add a loading spinner here */}
          {/* <p>Loading image...</p> */}
        </DialogContent>
      </Dialog>
    );
  }

  // If we reach here, isOpen is true AND displayImage is not null.
  const createdAtDate = displayImage.created_at ? new Date(displayImage.created_at) : null;
  const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'just now';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[90vw] h-[90vh] p-0 flex flex-col bg-card overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Image Details: {displayImage.enhanced_prompt ? `${displayImage.enhanced_prompt.substring(0,70)}${displayImage.enhanced_prompt.length > 70 ? "..." : ""}` : "Generated Image"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-grow flex items-center justify-center bg-muted/50 p-4">
          {displayImage.image_url && (
            <Image
              src={displayImage.image_url}
              alt={displayImage.enhanced_prompt || "Generated image"}
              fill
              style={{ objectFit: 'contain' }}
              data-ai-hint="detailed view"
              priority={true}
            />
          )}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80 text-foreground"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80 text-foreground"
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
        </div>

        <div className="p-4 border-t bg-card space-y-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <UserCircle className="h-5 w-5" />
            <span>{displayImage.user_name || displayImage.user_id}</span>
            <span className="text-xs">&bull; {timeAgo}</span>
            {images.length > 1 && (
                <span className="ml-auto text-xs">({currentIndex + 1} of {images.length})</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Enhanced Prompt:</h3>
            <p className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
              {displayImage.enhanced_prompt}
            </p>
          </div>
          <div className="flex justify-end items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRate("thumbs_up")}
              aria-label="Thumbs Up"
              disabled={isRatingInProgress}
              className={cn(
                "px-2 text-green-600 hover:bg-green-100 hover:text-green-700",
                currentUserVote === 'thumbs_up' && 'bg-green-100 text-green-700'
              )}
            >
              <ThumbsUp className={cn("h-5 w-5 mr-1", currentUserVote === 'thumbs_up' && 'fill-current')} /> {displayImage.thumbs_up}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRate("thumbs_down")}
              aria-label="Thumbs Down"
              disabled={isRatingInProgress}
              className={cn(
                "px-2 text-red-600 hover:bg-red-100 hover:text-red-700",
                currentUserVote === 'thumbs_down' && 'bg-red-100 text-red-700'
              )}
            >
              <ThumbsDown className={cn("h-5 w-5 mr-1", currentUserVote === 'thumbs_down' && 'fill-current')} /> {displayImage.thumbs_down}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}