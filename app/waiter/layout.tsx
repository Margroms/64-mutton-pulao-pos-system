"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem("sessionToken");
    if (token) {
      // For now, we'll allow access and let the main app handle user state
      setIsLoading(false);
    } else {
      setIsLoading(false);
      router.push("/");
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
