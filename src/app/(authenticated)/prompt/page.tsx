// src/app/(authenticated)/prompt/page.tsx - Uppdaterad för nya API
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { enhancePromptAndGenerateImage } from "@/ai/flows/enhance-prompt";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Send } from "lucide-react";

export default function PromptPage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast(); 
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit called. Current prompt:", prompt, "Current user:", currentUser);
    if (!prompt.trim() || !currentUser) {
      console.log("Prompt or user is missing, exiting handleSubmit.");
      return;
    }

    setIsLoading(true);
    console.log("isLoading set to true.");

    try {
      console.log("Attempting to call enhancePromptAndGenerateImage with prompt:", prompt);
      const result = await enhancePromptAndGenerateImage({ userPrompt: prompt });
      console.log("enhancePromptAndGenerateImage returned:", result);

      if (result && result.imageDataUri && result.enhancedPrompt) {
        console.log("Attempting to save image via API");
        
        const response = await fetch('/api/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: currentUser,
            original_prompt: prompt,
            enhanced_prompt: result.enhancedPrompt,
            image_data_uri: result.imageDataUri,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save image');
        }

        const saveResult = await response.json();
        console.log("API save result:", saveResult);
        
        setPrompt("");
        console.log("Prompt cleared.");

        setIsLoading(false); 
        console.log("isLoading set to false before navigating to collage."); 

        router.push("/collage?success=true"); 
        console.log("Navigated to /collage?success=true.");
      } else {
        console.error("enhancePromptAndGenerateImage did not return expected data:", result);
        toast({ 
          title: "Generation Failed",
          description: "The AI flow did not return the expected image data. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false); 
        console.log("isLoading set to false due to unexpected AI result.");
      }

    } catch (error) {
      console.error("Error in handleSubmit during image generation or saving:", error);
      let errorMessage = "Could not generate or save the image. Please try again.";
      if (error instanceof Error && error.message) {
        errorMessage = `Failed: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage = `Failed: ${error}`;
      }
      toast({ 
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("isLoading set to false in finally block (final check).");
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold flex items-center">
            <Sparkles className="h-8 w-8 mr-3 text-accent" />
            Skapa din bild
          </CardTitle>
          <CardDescription>
            Enter a prompt and our AI will enhance it and generate an image for you. Let your imagination run wild!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="prompt" className="text-lg font-medium">Beskriv Din idé</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., a cat wearing a tiny wizard hat, exploring a magical forest"
                rows={4}
                className="mt-2 text-base"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">Describe what you want to see. The more detail, the better!</p>
            </div>
            <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full md:w-auto text-lg py-3 px-6">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Enhance & Generate
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
         <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-lg text-foreground">AI is working its magic... Please wait.</p>
         </div>
      )}
    </div>
  );
}