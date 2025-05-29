"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut, Images, Feather } from "lucide-react";

export function Navbar() {
  const { logout, currentUser } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: "/prompt", label: "Create Prompt", icon: Feather },
    { href: "/collage", label: "Image Collage", icon: Images },
  ];

  return (
    <nav className="bg-green-400 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/prompt" className="flex-shrink-0 text-black hover:opacity-80 transition-opacity">
              <Feather className="h-8 w-8 mr-2 inline-block" />
              <span className="font-bold text-xl">Plan FBG</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "text-primary-foreground hover:bg-primary/80",
                  pathname === item.href ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
          <div className="flex items-center">
             {currentUser && (
                <span className="text-primary-foreground mr-4 text-sm hidden sm:inline">
                  Välkommen, {currentUser}
                </span>
              )}
            <Button variant="ghost" onClick={logout} className="text-primary-foreground hover:bg-primary/80">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
       {/* Mobile navigation links */}
       <div className="md:hidden border-t border-primary-foreground/20">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                 className={cn(
                  "w-full justify-start text-primary-foreground hover:bg-primary/80",
                  pathname === item.href ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
    </nav>
  );
}
