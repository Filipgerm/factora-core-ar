"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, updateUserType } from "@/lib/auth";
import type { UserType } from "@/lib/types/auth";

// Re-export UserType for backward compatibility
export type { UserType } from "@/lib/types/auth";

interface UserContextType {
  userType: UserType;
  setUserType: (type: UserType) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserTypeState] = useState<UserType>("financial_institution");
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  // Initialize from auth service session
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUserTypeState(session.userType);
    }
    setIsLoading(false);
  }, []);

  // Update user type via auth service
  const setUserType = async (type: UserType) => {
    try {
      await updateUserType(type);
      setUserTypeState(type);
      router.push("/home");

    } catch (error) {
      console.error("Failed to update user type:", error);
      // Fallback: still update local state even if auth service fails
      setUserTypeState(type);
      router.push("/home");
    }
  };

  return (
    <UserContext.Provider value={{ userType, setUserType, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
