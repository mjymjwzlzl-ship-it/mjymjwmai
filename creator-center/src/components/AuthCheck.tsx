'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthCheckProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthCheck({ children, requireAuth = true }: AuthCheckProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      
      if (requireAuth && !token) {
        router.push('/login');
        return;
      }
      
      if (!requireAuth && token) {
        router.push('/');
        return;
      }
      
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, requireAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}