
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
  const [email, setEmail] = useState(""); // Changed username to email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect to prompt page if already authenticated and not loading
    // This logic is also present in AuthContext, but can be kept here for robustness
    if (!isLoading && isAuthenticated) {
      router.replace("/prompt");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => { // Made handleSubmit async
    e.preventDefault();
    setError("");
    try {
      const success = await login({ email, password }); // Call with email, await the promise
      if (!success) {
        setError("Invalid email or password.");
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: `Welcome! Redirecting...`, // Updated welcome message
        });
        // router.replace("/prompt"); // NextAuth/AuthContext handles redirection
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred during login.");
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
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
              <Label htmlFor="email">Email</Label> {/* Changed label to Email */}
              <Input
                id="email"
                type="email" // Changed type to email
                value={email}
                onChange={(e) => setEmail(e.target.value)} // Update email state
                placeholder="user@example.com" // Updated placeholder
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
