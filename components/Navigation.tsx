"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ShoppingCart, 
  Receipt, 
  Settings,
  Bluetooth,
  Printer,
  Menu,
  X,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "waiter" | "admin" | "settings";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

interface NavigationProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentUser: User | null;
  isMobile: boolean;
}

export function Navigation({ currentRole, onRoleChange, currentUser, isMobile }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter navigation items based on user role
  const getNavigationItems = (): Array<{role: UserRole, label: string, icon: any, description: string}> => {
    const baseItems: Array<{role: UserRole, label: string, icon: any, description: string}> = [
      {
        role: "waiter",
        label: "Waiter",
        icon: Users,
        description: "Table management & orders"
      }
    ];

    // Admin can access all sections
    if (currentUser?.role === "admin") {
      baseItems.push({
        role: "admin",
        label: "Admin",
        icon: Receipt,
        description: "Billing & reports"
      });
      baseItems.push({
        role: "settings",
        label: "Settings",
        icon: Settings,
        description: "Printer & system config"
      });
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const NavigationContent = () => (
    <div className={cn(
      "bg-gray-50 border-r border-gray-200 h-screen flex flex-col",
      isMobile ? "w-full" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-gray-700" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">POS System</h1>
              <p className="text-xs sm:text-sm text-gray-600">Restaurant Management</p>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRole === item.role;
            
            return (
              <Button
                key={item.role}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-4 flex-col items-start",
                  isActive && "bg-gray-900 text-white"
                )}
                onClick={() => onRoleChange(item.role)}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <p className="text-xs opacity-70 mt-1 text-left">
                  {item.description}
                </p>
              </Button>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Current User & Role Status */}
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Current User</span>
          </div>
          <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={currentUser?.role === "admin" ? "default" : "secondary"} className="text-xs">
              {currentUser?.role}
            </Badge>
            {currentRole !== currentUser?.role && (
              <Badge variant="outline" className="text-xs">
                Viewing: {currentRole}
              </Badge>
            )}
          </div>
        </div>

        {/* Printer Status */}
        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Printer className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Printers</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bluetooth className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-gray-600">Kitchen: Disconnected</span>
            </div>
            <div className="flex items-center gap-2">
              <Bluetooth className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-gray-600">Billing: Disconnected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Version 1.0.0
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="bg-white shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="relative flex flex-col w-80 max-w-xs bg-gray-50 shadow-xl">
              <NavigationContent />
            </div>
          </div>
        )}
      </>
    );
  }

  return <NavigationContent />;
}
