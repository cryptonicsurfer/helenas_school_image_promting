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
import { ImageSortCriteria, ImageFilterCriteria } from "@/lib/database"; // Import criteria types

export default function CollagePage() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial load and filter/sort changes
  const [isPolling, setIsPolling] = useState(false); // For background polling updates
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [sortBy, setSortBy] = useState<ImageSortCriteria>('created_at_desc');
  const [filterBy, setFilterBy] = useState<ImageFilterCriteria>('all');

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

    const fetchImages = async (isInitialOrFilterChange = false) => {
      if (isInitialOrFilterChange) {
        setIsLoading(true);
      } else {
        setIsPolling(true); // Indicate background polling
      }
      try {
        let apiUrl = `/api/images?sortBy=${sortBy}&filterBy=${filterBy}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch images (status: ${response.status})`);
        }
        const fetchedImages = await response.json();
        // Only update if data has actually changed to prevent unnecessary re-renders
        // This is a shallow comparison, for deep comparison a library might be needed
        if (JSON.stringify(images) !== JSON.stringify(fetchedImages)) {
            setImages(fetchedImages);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        if (isInitialOrFilterChange) { // Only show toast for user-initiated fetches
            toast({
                title: "Error Fetching Images",
                description: (error as Error).message || "Could not load images. Please try again later.",
                variant: "destructive",
            });
        }
      } finally {
        if (isInitialOrFilterChange) {
          setIsLoading(false);
        } else {
          setIsPolling(false);
        }
      }
    };

    // Fetch images when sortBy or filterBy changes (user-initiated)
    fetchImages(true);

    // Polling for background updates
    pollInterval = setInterval(() => fetchImages(false), 10000); // Increased polling interval

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sortBy, filterBy, toast, currentUser]); // Removed 'images' from dependency array to avoid re-triggering on setImages

  const handleSortChange = (newSortCriteria: ImageSortCriteria) => {
    setSortBy(newSortCriteria); // This will trigger the useEffect above
  };

  const handleFilterChange = (newFilterCriteria: ImageFilterCriteria) => {
    if (newFilterCriteria === 'favorites' && !currentUser) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to view your favorites.",
        variant: "default",
      });
      return;
    }
    setFilterBy(newFilterCriteria);
  };

  const openCarousel = (index: number) => {
    setCarouselStartIndex(index);
    setIsCarouselOpen(true);
  };

  const handleImageUpdate = (updatedImage: ImageEntry) => {
    setImages(currentImages =>
      currentImages.map(img => (img.id === updatedImage.id ? updatedImage : img))
    );
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        {images.length > 0 && !isLoading && (
          <Button onClick={() => openCarousel(0)} variant="outline">
            View All in Carousel
          </Button>
        )}
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          <Button
            variant={sortBy === 'created_at_desc' ? 'default' : 'outline'}
            onClick={() => handleSortChange('created_at_desc')}
            size="sm"
          >
            Sort: Newest
          </Button>
          <Button
            variant={sortBy === 'thumbs_up_desc' ? 'default' : 'outline'}
            onClick={() => handleSortChange('thumbs_up_desc')}
            size="sm"
          >
            Sort: Most Liked
          </Button>
          <Button
            variant={filterBy === 'all' ? 'default' : 'outline'}
            onClick={() => handleFilterChange('all')}
            size="sm"
          >
            Filter: All
          </Button>
          <Button
            variant={filterBy === 'favorites' ? 'default' : 'outline'}
            onClick={() => handleFilterChange('favorites')}
            size="sm"
            disabled={!currentUser} // Disable if user not logged in
          >
            Filter: My Favorites
          </Button>
        </div>
      </div>
      
      {(isLoading) && ( // Show skeleton only on initial load or filter/sort change
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
              onImageUpdate={handleImageUpdate} // Pass the updater function
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