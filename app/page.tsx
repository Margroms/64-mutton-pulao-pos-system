"use client";

import { useState } from "react";
import { AuthWrapper } from "@/components/AuthWrapper";
import { Navigation } from "@/components/Navigation";
import { WaiterDashboard } from "@/components/WaiterDashboard";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>("waiter");

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole("waiter");
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

  const renderDashboard = () => {
    switch (currentRole) {
      case "waiter":
        return <WaiterDashboard currentUser={currentUser} />;
      case "admin":
        return <AdminDashboard currentUser={currentUser} />;
      case "settings":
        return <SettingsDashboard />;
      default:
        return <WaiterDashboard currentUser={currentUser} />;
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
