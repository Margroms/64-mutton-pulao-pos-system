"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthWrapper } from "@/components/AuthWrapper";
import { Navigation } from "@/components/Navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { SettingsDashboard } from "@/components/SettingsDashboard";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

type UserRole = "waiter" | "admin" | "settings";

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>("waiter");

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    const userInfo = localStorage.getItem("userInfo");
    
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setCurrentUser(user);
        setCurrentRole(user.role);
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    
    // Store user info in localStorage
    localStorage.setItem("userInfo", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole("waiter");
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userInfo");
  };

  const handleRoleChange = (role: UserRole) => {
    // Only allow role changes for admin users
    if (currentUser?.role === "admin") {
      setCurrentRole(role);
    } else if (role === "waiter") {
      // Waiters can only access waiter dashboard
      setCurrentRole("waiter");
    }
  };

  const goToWaiter = () => {
    router.push("/waiter");
  };

  const renderDashboard = () => {
    switch (currentRole) {
      case "waiter":
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Welcome to Waiter Dashboard</h1>
              <p className="text-gray-600 mb-6">Please use the navigation to access waiter functions</p>
              <button
                onClick={goToWaiter}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Waiter Dashboard
              </button>
            </div>
          </div>
        );
      case "admin":
        return <AdminDashboard currentUser={currentUser} />;
      case "settings":
        return <SettingsDashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Welcome to Waiter Dashboard</h1>
              <p className="text-gray-600 mb-6">Please use the navigation to access waiter functions</p>
              <button
                onClick={goToWaiter}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Waiter Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AuthWrapper 
      currentUser={currentUser} 
      onLogin={handleLogin} 
      onLogout={handleLogout}
    >
      <div className="flex h-screen bg-gray-100">
        {/* Mobile Navigation - Hidden on desktop */}
        <div className="lg:hidden">
          <Navigation 
            currentRole={currentRole} 
            onRoleChange={handleRoleChange}
            currentUser={currentUser}
            isMobile={true}
          />
        </div>
        
        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden lg:block">
          <Navigation 
            currentRole={currentRole} 
            onRoleChange={handleRoleChange}
            currentUser={currentUser}
            isMobile={false}
          />
        </div>
        
        <main className="flex-1 overflow-auto">
          {renderDashboard()}
        </main>
      </div>
    </AuthWrapper>
  );
}
