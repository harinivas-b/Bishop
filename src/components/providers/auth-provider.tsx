"use client";

import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/components/ui/loading";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app and initializes the Supabase auth session.
 * Shows a branded loading screen while the session is being resolved.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Preparing your workspace..." />;
  }

  return <>{children}</>;
}
