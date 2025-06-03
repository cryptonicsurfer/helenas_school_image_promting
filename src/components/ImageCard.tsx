// src/components/ImageCard.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, UserCircle, Expand } from "lucide-react";
import type { ImageEntry } from "@/services/imageService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

interface ImageCardProps {
  image: ImageEntry;
  onView: () => void;
  currentUser: string;
}

export function ImageCard({ image, onView, currentUser }: ImageCardProps) {
  const { toast } = useToast();

  const handleRate = async (ratingType: "thumbs_up" | "thumbs_down") => {
    try {
      const response = await fetch(`/api/images/${image.id}/rate`, {
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
        description: `You rated ${ratingType === "thumbs_up" ? "thumbs up" : "thumbs down"}.`,
      });
    } catch (error) {
      toast({
        title: "Rating Error",
        description: "Could not submit your rating. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const createdAtDate = image.created_at ? new Date(image.created_at) : null;
  const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'just now';

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <UserCircle className="h-5 w-5" />
          <span>{image.user_name || image.user_id}</span>
          <span className="text-xs">&bull; {timeAgo}</span>
        </div>
        <CardTitle className="text-lg leading-tight">Enhanced Prompt:</CardTitle>
        <CardDescription className="text-sm h-16 overflow-y-auto">{image.enhanced_prompt}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        {image.image_url && (
          <div className="aspect-video relative w-full bg-muted cursor-pointer" onClick={onView}>
            <Image
              src={image.image_url}
              alt={image.enhanced_prompt || "Generated image"}
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
            className="text-green-600 hover:bg-green-100 hover:text-green-700 px-2"
          >
            <ThumbsUp className="h-5 w-5 mr-1" /> {image.thumbs_up}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRate("thumbs_down")}
            aria-label="Thumbs Down"
            className="text-red-600 hover:bg-red-100 hover:text-red-700 px-2"
          >
            <ThumbsDown className="h-5 w-5 mr-1" /> {image.thumbs_down}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onView} aria-label="View Full Image" className="px-2">
          <Expand className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">View</span>
        </Button>
      </CardFooter>
    </Card>
  );
}