
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, UserCircle, Expand } from "lucide-react";
import type { ImageEntry } from "@/services/firestoreService";
import { rateImage } from "@/services/firestoreService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

interface ImageCardProps {
  image: ImageEntry;
  onView: () => void; // Callback to open the image in a carousel/modal
}

export function ImageCard({ image, onView }: ImageCardProps) {
  const { toast } = useToast();

  const handleRate = async (ratingType: "thumbsUp" | "thumbsDown") => {
    try {
      await rateImage(image.id, ratingType);
      toast({
        title: "Rating Submitted",
        description: `You rated ${ratingType === "thumbsUp" ? "thumbs up" : "thumbs down"}.`,
      });
    } catch (error) {
      toast({
        title: "Rating Error",
        description: "Could not submit your rating. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const timeAgo = image.createdAt ? formatDistanceToNow(image.createdAt.toDate(), { addSuffix: true }) : 'just now';

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <UserCircle className="h-5 w-5" />
          <span>{image.userId}</span>
          <span className="text-xs">&bull; {timeAgo}</span>
        </div>
        <CardTitle className="text-lg leading-tight">Enhanced Prompt:</CardTitle>
        <CardDescription className="text-sm h-16 overflow-y-auto">{image.enhancedPrompt}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        {image.imageDataUri && (
          <div className="aspect-video relative w-full bg-muted cursor-pointer" onClick={onView}>
            <Image
              src={image.imageDataUri}
              alt={image.enhancedPrompt || "Generated image"}
              layout="fill"
              objectFit="contain"
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
            onClick={() => handleRate("thumbsUp")}
            aria-label="Thumbs Up"
            className="text-green-600 hover:bg-green-100 hover:text-green-700 px-2"
          >
            <ThumbsUp className="h-5 w-5 mr-1" /> {image.thumbsUp}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRate("thumbsDown")}
            aria-label="Thumbs Down"
            className="text-red-600 hover:bg-red-100 hover:text-red-700 px-2"
          >
            <ThumbsDown className="h-5 w-5 mr-1" /> {image.thumbsDown}
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
