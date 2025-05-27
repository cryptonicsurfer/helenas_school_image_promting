
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Added DialogHeader, DialogTitle
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, UserCircle, X } from 'lucide-react';
import type { ImageEntry } from '@/services/firestoreService';
import { rateImage } from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ImageCarouselModalProps {
  images: ImageEntry[];
  startIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageCarouselModal({ images, startIndex, isOpen, onClose }: ImageCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [startIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (images.length === 0) {
        onClose(); 
      } else if (currentIndex >= images.length) {
        setCurrentIndex(Math.max(0, images.length - 1)); 
      }
    }
  }, [images, currentIndex, isOpen, onClose]);

  const handleRate = async (ratingType: "thumbsUp" | "thumbsDown") => {
    if (!currentImage) return;
    try {
      await rateImage(currentImage.id, ratingType);
      toast({
        title: "Rating Submitted",
        description: `You rated this image ${ratingType === "thumbsUp" ? "thumbs up" : "thumbs down"}.`,
      });
      // Firestore real-time updates should refresh counts, no need to manually update state here for images prop
    } catch (error) {
      toast({
        title: "Rating Error",
        description: "Could not submit your rating. Please try again.",
        variant: "destructive",
      });
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

  const currentImage = images[currentIndex];
  if (!currentImage) {
    onClose();
    return null;
  }

  const timeAgo = currentImage.createdAt ? formatDistanceToNow(currentImage.createdAt.toDate(), { addSuffix: true }) : 'just now';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[90vw] h-[90vh] p-0 flex flex-col bg-card overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Image Details: {currentImage.enhancedPrompt ? `${currentImage.enhancedPrompt.substring(0,70)}${currentImage.enhancedPrompt.length > 70 ? "..." : ""}` : "Generated Image"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="absolute top-2 right-2 z-20">
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close carousel">
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        </div>

        <div className="relative flex-grow flex items-center justify-center bg-muted/50 p-4">
          {currentImage.imageDataUri && (
            <Image
              src={currentImage.imageDataUri}
              alt={currentImage.enhancedPrompt || "Generated image"}
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
            <span>{currentImage.userId}</span>
            <span className="text-xs">&bull; {timeAgo}</span>
            {images.length > 1 && (
                <span className="ml-auto text-xs">({currentIndex + 1} of {images.length})</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Enhanced Prompt:</h3>
            <p className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
              {currentImage.enhancedPrompt}
            </p>
          </div>
          <div className="flex justify-end items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRate("thumbsUp")}
              aria-label="Thumbs Up"
              className="text-green-600 hover:bg-green-100 hover:text-green-700 px-2"
            >
              <ThumbsUp className="h-5 w-5 mr-1" /> {currentImage.thumbsUp}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRate("thumbsDown")}
              aria-label="Thumbs Down"
              className="text-red-600 hover:bg-red-100 hover:text-red-700 px-2"
            >
              <ThumbsDown className="h-5 w-5 mr-1" /> {currentImage.thumbsDown}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

