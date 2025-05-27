
"use client";

import React, { useEffect, useState } from "react";
import { getImages, type ImageEntry } from "@/services/firestoreService";
import { ImageCard } from "@/components/ImageCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Images, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ImageCarouselModal } from "@/components/ImageCarouselModal"; 
import { Button } from "@/components/ui/button";

export default function CollagePage() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({
        title: "Image Generated & Saved!",
        description: "Your masterpiece is now in the collage.",
      });
      // Remove the query parameter to prevent toast on refresh/re-navigation
      const current = new URL(window.location.href);
      current.searchParams.delete('success');
      router.replace(current.pathname + current.search, { scroll: false });
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    console.log("[CollagePage] Setting up Firestore listener for images...");
    setIsLoading(true);
    const unsubscribe = getImages((fetchedImages) => {
      console.log('[CollagePage] Received images from getImages callback. Count:', fetchedImages.length, 'Data:', fetchedImages);
      setImages(fetchedImages);
      setIsLoading(false);
    });
    return () => {
      console.log("[CollagePage] Cleaning up Firestore listener.");
      unsubscribe(); // Cleanup listener on component unmount
    }
  }, []);

  const openCarousel = (index: number) => {
    setCarouselStartIndex(index);
    setIsCarouselOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center text-primary">
          <Images className="h-10 w-10 mr-3" />
          Collective Collage
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">See what everyone is creating!</p>
      </div>
      
      {images.length > 0 && !isLoading && (
        <Button onClick={() => openCarousel(0)} variant="outline" className="mb-4">
           View All in Carousel
        </Button>
      )}


      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <Skeleton className="h-10 w-3/4 m-4" /> 
              <Skeleton className="h-6 w-full m-4" />
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 flex justify-between">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && images.length === 0 && (
         <Alert className="border-accent text-accent-foreground bg-accent/10">
          <Info className="h-5 w-5 !text-accent" />
          <AlertTitle className="font-semibold">No Images Yet!</AlertTitle>
          <AlertDescription>
            Be the first to create an image. Head over to the 'Create Prompt' page to generate your masterpiece. (If you have created images, check the browser console for Firestore connection errors.)
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <ImageCard 
              key={image.id} 
              image={image} 
              onView={() => openCarousel(index)}
            />
          ))}
        </div>
      )}

      {isCarouselOpen && images.length > 0 && (
        <ImageCarouselModal
          images={images}
          startIndex={carouselStartIndex}
          isOpen={isCarouselOpen}
          onClose={() => setIsCarouselOpen(false)}
        />
      )}
    </div>
  );
}

// Keep Card component for Skeletons if still used elsewhere, or remove if not.
// Assuming Skeleton might still use it implicitly or explicitly.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className || ''}`}
    {...props}
  />
));
Card.displayName = "Card";
