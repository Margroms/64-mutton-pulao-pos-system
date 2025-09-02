"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  LogIn, 
  LogOut, 
  Mail, 
  Key,
  Shield
} from "lucide-react";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

interface AuthWrapperProps {
  children: React.ReactNode;
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

export function AuthWrapper({ children, currentUser, onLogin, onLogout }: AuthWrapperProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Convex mutations
  const authenticateUserMutation = useMutation(api.auth.authenticateUser);
  const logoutUserMutation = useMutation(api.auth.logoutUser);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (token) {
      // TODO: Validate token with Convex
      setSessionToken(token);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use Convex authentication
      const result = await authenticateUserMutation({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (result && result.user) {
        // Store session token
        localStorage.setItem("sessionToken", result.sessionId);
        setSessionToken(result.sessionId);
        
        // Login user
        onLogin(result.user);
        setLoginEmail("");
        setLoginPassword("");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-gray-600" />
                <h1 className="text-lg font-semibold text-gray-900">POS System</h1>
              </div>
              <Badge variant={currentUser.role === "admin" ? "default" : "secondary"}>
                {currentUser.role === "admin" ? "Administrator" : "Waiter"}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>{currentUser.name}</span>
                <span className="text-gray-400">({currentUser.email})</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (sessionToken) {
                    try {
                      await logoutUserMutation({ token: sessionToken });
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                  }
                  localStorage.removeItem("sessionToken");
                  setSessionToken(null);
                  onLogout();
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-gray-700" />
            <CardTitle className="text-2xl">POS System</CardTitle>
          </div>
          <p className="text-gray-600">Restaurant Management System</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              <LogIn className="h-4 w-4 mr-2" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
