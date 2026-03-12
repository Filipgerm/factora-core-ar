"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site-config";

interface SitePasswordProtectionProps {
  children: React.ReactNode;
}

export function SitePasswordProtection({
  children,
}: SitePasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem(SITE_CONFIG.SESSION.storageKey);
    const authTimestamp = localStorage.getItem(
      `${SITE_CONFIG.SESSION.storageKey}-timestamp`
    );

    if (authStatus === "true" && authTimestamp) {
      const now = Date.now();
      const sessionTime = parseInt(authTimestamp);

      // Check if session is still valid
      if (now - sessionTime < SITE_CONFIG.SESSION.duration) {
        setIsAuthenticated(true);
      } else {
        // Session expired, clear it
        localStorage.removeItem(SITE_CONFIG.SESSION.storageKey);
        localStorage.removeItem(`${SITE_CONFIG.SESSION.storageKey}-timestamp`);
      }
    }
    setIsInitialized(true);
  }, []);

  // Ensure styles are loaded before rendering
  useEffect(() => {
    // Wait for styles to be applied
    const timer = setTimeout(() => {
      setStylesLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate a small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (inputPassword === SITE_CONFIG.PASSWORD) {
      setIsAuthenticated(true);
      const timestamp = Date.now().toString();
      localStorage.setItem(SITE_CONFIG.SESSION.storageKey, "true");
      localStorage.setItem(
        `${SITE_CONFIG.SESSION.storageKey}-timestamp`,
        timestamp
      );
    } else {
      setError("Incorrect password. Please try again.");
      setInputPassword("");
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(SITE_CONFIG.SESSION.storageKey);
    localStorage.removeItem(`${SITE_CONFIG.SESSION.storageKey}-timestamp`);
    setInputPassword("");
    setError("");
  };

  // Don't render anything until we've checked localStorage and styles are loaded
  if (!isInitialized || !stylesLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the protected content
  if (isAuthenticated) {
    return (
      <>
        {children}
        {/* Optional: Add a logout button in the corner */}
        {/* <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="opacity-50 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Lock className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div> */}
      </>
    );
  }

  // Show password prompt
  return (
    <div className="dashboard-theme min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            {SITE_CONFIG.PASSWORD_PROMPT.title}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {SITE_CONFIG.PASSWORD_PROMPT.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="border-destructive bg-destructive/10"
              >
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring focus:ring-offset-2"
              disabled={isLoading || !inputPassword.trim()}
            >
              {isLoading ? "Verifying..." : "Access Website"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
