"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const router = useRouter();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 
            className="text-xl font-bold text-gray-900 cursor-pointer"
            onClick={() => router.push("/")}
          >
            Restaurant POS System
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.push("/")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Home
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push("/waiter")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Waiter Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push("/billing")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Billing Dashboard
          </Button>
        </div>
      </div>
    </nav>
  );
}
