
"use client";

import { useState, type FormEvent, useEffect } from "react"; // Added useEffect
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Feather, LogIn } from "lucide-react";
import { useRouter } from "next/navigation"; // Added useRouter

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated, isLoading } = useAuth(); // Added isAuthenticated and isLoading
  const { toast } = useToast();
  const router = useRouter(); // Initialized router

  useEffect(() => {
    // Redirect to prompt page if already authenticated and not loading
    if (!isLoading && isAuthenticated) {
      router.replace("/prompt");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login({ username, password });
    if (!success) {
      setError("Invalid username or password.");
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    } else {
       toast({
        title: "Login Successful",
        description: `Welcome back, ${username}!`,
      });
      // Navigation is now handled by AuthContext's login or the useEffect above
    }
  };

  // If loading or already authenticated (and waiting for redirect), show minimal UI or loader
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        {/* You might want a loader here, but for now, keeping it simple */}
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <Feather className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Prompt Enhance</CardTitle>
          <CardDescription>Please login to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., elev1"
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-base"
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full text-lg py-6">
              <LogIn className="mr-2 h-5 w-5" /> Login
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground">
          <p>Enter your provided credentials to access the application.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
