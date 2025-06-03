// src/components/ImageCard.tsx
"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react"; // Import useState, useRef, useEffect
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, UserCircle, Expand, Trash2, Heart } from "lucide-react";
import type { ImageEntry } from "@/services/imageService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

interface ImageCardProps {
  image: ImageEntry; // This is the server-truth version
  onView: () => void;
  currentUser: string;
  onImageUpdate: (updatedImage: ImageEntry) => void; // To inform parent of optimistic changes
}

export function ImageCard({ image: serverImage, onView, currentUser, onImageUpdate }: ImageCardProps) {
  const { toast } = useToast();
  const [localImage, setLocalImage] = useState<ImageEntry>(serverImage);
  const [optimisticUserVote, setOptimisticUserVote] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isRatingInProgress, setIsRatingInProgress] = useState(false);
  const ratingApiCallInProgressRef = useRef(false);

  useEffect(() => {
    setLocalImage(serverImage);
    // When serverImage changes (e.g. due to polling), reset local optimistic vote.
    // A more sophisticated approach might try to reconcile, but reset is simpler.
    setOptimisticUserVote(null);
  }, [serverImage]);

  const handleRate = async (ratingType: "thumbs_up" | "thumbs_down") => {
    if (ratingApiCallInProgressRef.current) return; // Immediate guard using ref
    
    ratingApiCallInProgressRef.current = true;
    setIsRatingInProgress(true);

    const imageBeforeOptimisticUpdate = { ...localImage }; // For rollback
    const voteBeforeOptimisticUpdate = optimisticUserVote; // For rollback & logic

    let newThumbsUp = localImage.thumbs_up;
    let newThumbsDown = localImage.thumbs_down;
    let newOptimisticVoteState: 'thumbs_up' | 'thumbs_down' | null = optimisticUserVote;
    let hasVoteChanged = false;

    if (ratingType === "thumbs_up") {
      if (optimisticUserVote !== "thumbs_up") { // If not already thumbs_up, or changing vote
        newOptimisticVoteState = "thumbs_up";
        newThumbsUp = 1; // Set to 1
        if (optimisticUserVote === "thumbs_down") { // If switching from thumbs_down
          newThumbsDown = 0; // Set previous vote count to 0
        } else if (optimisticUserVote === null) { // New vote, ensure other is zero
          newThumbsDown = 0;
        }
        hasVoteChanged = true;
      }
      // If optimisticUserVote was already "thumbs_up", no change, hasVoteChanged remains false.
    } else { // ratingType === "thumbs_down"
      if (optimisticUserVote !== "thumbs_down") { // If not already thumbs_down, or changing vote
        newOptimisticVoteState = "thumbs_down";
        newThumbsDown = 1; // Set to 1
        if (optimisticUserVote === "thumbs_up") { // If switching from thumbs_up
          newThumbsUp = 0; // Set previous vote count to 0
        } else if (optimisticUserVote === null) { // New vote, ensure other is zero
          newThumbsUp = 0;
        }
        hasVoteChanged = true;
      }
      // If optimisticUserVote was already "thumbs_down", no change, hasVoteChanged remains false.
    }

    if (!hasVoteChanged) {
      // No actual change in vote state. Reset flags and return, as API call is not needed.
      ratingApiCallInProgressRef.current = false;
      setIsRatingInProgress(false);
      return;
    }
    
    // If we reach here, vote has changed. Proceed with optimistic update.
    const updatedLocalImage = {
      ...localImage, // Preserve other properties of localImage
      thumbs_up: newThumbsUp,
      thumbs_down: newThumbsDown
    };

    setLocalImage(updatedLocalImage);
    setOptimisticUserVote(newOptimisticVoteState);
    onImageUpdate(updatedLocalImage); // Inform parent

    try {
      const response = await fetch(`/api/images/${localImage.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratingType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to rate image');
      }
      
      toast({
        title: "Rating Submitted",
        description: `You rated ${ratingType === "thumbs_up" ? "thumbs up" : "thumbs down"}.`,
      });
      // The parent page's polling will eventually fetch the true state from the server.
    } catch (error) {
      setLocalImage(imageBeforeOptimisticUpdate); // Revert local display
      setOptimisticUserVote(voteBeforeOptimisticUpdate); // Revert local vote state
      onImageUpdate(imageBeforeOptimisticUpdate); // Inform parent of revert
      toast({
        title: "Rating Error",
        description: (error as Error).message || "Could not submit your rating.",
        variant: "destructive",
      });
    } finally {
      ratingApiCallInProgressRef.current = false; // Reset ref flag
      setIsRatingInProgress(false);
    }
  };

  const handleToggleFavorite = async () => {
    const imageBeforeThisClick = { ...localImage };
    const newLocalImage = {
      ...localImage,
      is_favorited: !localImage.is_favorited,
    };

    setLocalImage(newLocalImage);
    onImageUpdate(newLocalImage);

    const method = newLocalImage.is_favorited ? 'POST' : 'DELETE';
    const actionText = newLocalImage.is_favorited ? "favorited" : "unfavorited";

    try {
      const response = await fetch(`/api/images/${localImage.id}/favorite`, { method });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${actionText} image`);
      }
      
      toast({
        title: `Image ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
        description: `The image has been successfully ${actionText}.`,
      });
      // Polling will eventually fetch true state.
    } catch (error) {
      setLocalImage(imageBeforeThisClick); // Revert local display
      onImageUpdate(imageBeforeThisClick); // Inform parent of revert
      toast({
        title: "Favorite Error",
        description: (error as Error).message || `Could not ${actionText} the image.`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    // Optional: Add a confirmation dialog here
    // e.g., if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const response = await fetch(`/api/images/${localImage.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Catch if response is not JSON
        throw new Error(errorData.error || 'Failed to delete image');
      }

      toast({
        title: "Image Deleted",
        description: "The image has been successfully deleted.",
      });
      // router.refresh(); // Refresh to update the UI - Removed for smoother updates
    } catch (error) {
      toast({
        title: "Deletion Error",
        description: (error as Error).message || "Could not delete the image. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const createdAtDate = localImage.created_at ? new Date(localImage.created_at) : null;
  const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'just now';

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <UserCircle className="h-5 w-5" />
          <span>{localImage.user_name || localImage.user_id}</span>
          <span className="text-xs">&bull; {timeAgo}</span>
        </div>
        <CardTitle className="text-lg leading-tight">Enhanced Prompt:</CardTitle>
        <CardDescription className="text-sm h-16 overflow-y-auto">{localImage.enhanced_prompt}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        {localImage.image_url && (
          <div className="aspect-video relative w-full bg-muted cursor-pointer" onClick={onView}>
            <Image
              src={localImage.image_url}
              alt={localImage.enhanced_prompt || "Generated image"}
              fill
              style={{ objectFit: 'contain' }}
              data-ai-hint="abstract art"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRate("thumbs_up")}
            aria-label="Thumbs Up"
            className={`px-2 ${optimisticUserVote === 'thumbs_up' ? 'text-green-700 bg-green-100' : 'text-green-600 hover:bg-green-100 hover:text-green-700'}`}
            disabled={isRatingInProgress}
          >
            <ThumbsUp className={`h-5 w-5 mr-1 ${optimisticUserVote === 'thumbs_up' ? 'fill-current' : ''}`} /> {localImage.thumbs_up}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRate("thumbs_down")}
            aria-label="Thumbs Down"
            className={`px-2 ${optimisticUserVote === 'thumbs_down' ? 'text-red-700 bg-red-100' : 'text-red-600 hover:bg-red-100 hover:text-red-700'}`}
            disabled={isRatingInProgress}
          >
            <ThumbsDown className={`h-5 w-5 mr-1 ${optimisticUserVote === 'thumbs_down' ? 'fill-current' : ''}`} /> {localImage.thumbs_down}
          </Button>
        </div>
        <div className="flex items-center space-x-1">
          {currentUser === localImage.user_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete Image"
              className="text-destructive hover:bg-red-100 hover:text-destructive-foreground px-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onView} aria-label="View Full Image" className="px-2">
            <Expand className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">View</span>
          </Button>
           {currentUser && ( // Only show favorite button if user is logged in
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              aria-label={localImage.is_favorited ? "Unfavorite Image" : "Favorite Image"}
              className={`px-2 ${localImage.is_favorited ? 'text-red-500 hover:bg-red-100 hover:text-red-600' : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-700'}`}
            >
              <Heart className={`h-4 w-4 ${localImage.is_favorited ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}