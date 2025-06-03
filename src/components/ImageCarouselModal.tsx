"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  const { currentUser } = useAuth(); // ✅ Lägg till för att få användare

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

  // ✅ Uppdaterad handleRate-funktion för att använda nya API:et
  const handleRate = async (ratingType: "thumbs_up" | "thumbs_down") => {
    if (!currentImage || !currentUser) return;
    
    try {
      const response = await fetch(`/api/images/${currentImage.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser,
          ratingType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rate image');
      }

      toast({
        title: "Rating Submitted",
        description: `You rated this image ${ratingType === "thumbs_up" ? "thumbs up" : "thumbs down"}.`,
      });
      
      // Polling kommer att uppdatera bilderna automatiskt
    } catch (error) {
      console.error('Rating error:', error);
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

  const createdAtDate = currentImage.created_at ? new Date(currentImage.created_at) : null;
  const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'just now';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[90vw] h-[90vh] p-0 flex flex-col bg-card overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Image Details: {currentImage.enhanced_prompt ? `${currentImage.enhanced_prompt.substring(0,70)}${currentImage.enhanced_prompt.length > 70 ? "..." : ""}` : "Generated Image"}
          </DialogTitle>
        </DialogHeader>
        
        {/* The DialogContent component from ui/dialog already includes a close button */}
        {/* Removed redundant explicit close button to fix double X icon issue */}

        <div className="relative flex-grow flex items-center justify-center bg-muted/50 p-4">
          {/* ✅ Använd image_url istället för image_data_uri */}
          {currentImage.image_url && (
            <Image
              src={currentImage.image_url}
              alt={currentImage.enhanced_prompt || "Generated image"}
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
            <span>{currentImage.user_name || currentImage.user_id}</span>
            <span className="text-xs">&bull; {timeAgo}</span>
            {images.length > 1 && (
                <span className="ml-auto text-xs">({currentIndex + 1} of {images.length})</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Enhanced Prompt:</h3>
            <p className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
              {currentImage.enhanced_prompt}
            </p>
          </div>
          <div className="flex justify-end items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRate("thumbs_up")}
              aria-label="Thumbs Up"
              className="text-green-600 hover:bg-green-100 hover:text-green-700 px-2"
            >
              <ThumbsUp className="h-5 w-5 mr-1" /> {currentImage.thumbs_up}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRate("thumbs_down")}
              aria-label="Thumbs Down"
              className="text-red-600 hover:bg-red-100 hover:text-red-700 px-2"
            >
              <ThumbsDown className="h-5 w-5 mr-1" /> {currentImage.thumbs_down}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}