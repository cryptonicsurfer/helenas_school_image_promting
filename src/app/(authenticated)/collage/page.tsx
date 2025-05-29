// src/app/(authenticated)/collage/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { type ImageEntry } from "@/services/imageService"; // ✅ Ändrat från supabaseService
import { ImageCard } from "@/components/ImageCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Images, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ImageCarouselModal } from "@/components/ImageCarouselModal"; 
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function CollagePage() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({
        title: "Image Generated & Saved!",
        description: "Your masterpiece is now in the collage.",
      });
      const current = new URL(window.location.href);
      current.searchParams.delete('success');
      router.replace(current.pathname + current.search, { scroll: false });
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const fetchImages = async () => {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) throw new Error('Failed to fetch images');
        const fetchedImages = await response.json();
        setImages(fetchedImages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching images:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchImages();

    // Poll for updates every 5 seconds
    pollInterval = setInterval(fetchImages, 5000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
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
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && images.length === 0 && (
         <Alert className="border-accent text-accent-foreground bg-accent/10">
          <Info className="h-5 w-5 !text-accent" />
          <AlertTitle className="font-semibold">No Images Yet!</AlertTitle>
          <AlertDescription>
            Be the first to create an image. Head over to the 'Create Prompt' page to generate your masterpiece.
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
              currentUser={currentUser || ''}
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

// Skeleton Card component
function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm shadow-lg">
      <Skeleton className="h-10 w-3/4 m-4" /> 
      <Skeleton className="h-6 w-full m-4" />
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 flex justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}