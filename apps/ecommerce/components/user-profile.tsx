'use client';

import { useEffect, useState } from 'react';
import { User, LogOut, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthTokenClient } from '@/src/lib/auth-client';

interface UserData {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
}

export function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const token = getAuthTokenClient();
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // If auth fails, clear user state
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Load immediately
    loadUser();
    
    // Reload on auth events
    const handleAuthChange = () => {
      const token = getAuthTokenClient();
      if (!token) {
        // If no token, clear user state immediately
        setUser(null);
        setLoading(false);
        return;
      }
      setTimeout(loadUser, 100); // Small delay to ensure cookies are set
    };
    window.addEventListener('auth:changed', handleAuthChange);
    
    // Also check periodically for a short time (in case cookie takes time to set)
    let checkCount = 0;
    const maxChecks = 5; // Check 5 times over 5 seconds
    const interval = setInterval(() => {
      checkCount++;
      const token = getAuthTokenClient();
      if (token && !user) {
        loadUser();
      } else if (!token && user) {
        // If token was removed (logout), clear user state
        setUser(null);
        setLoading(false);
      }
      if (checkCount >= maxChecks) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('auth:changed', handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    // Clear both cookies immediately
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'auth_token_client=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Clear user state immediately
    setUser(null);
    setLoading(false);
    setShowMenu(false);
    
    try {
      // Try to call logout API, but don't wait for it if it fails
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
        // Silently fail - we've already cleared local state
      });
    } catch (err) {
      // Ignore fetch errors
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:changed'));
    }
    
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <Link href="/login" className="text-xs sm:text-sm underline underline-offset-2 whitespace-nowrap">
        Login / Register
      </Link>
    );
  }

  if (!user) {
    return (
      <Link href="/login" className="text-xs sm:text-sm underline underline-offset-2 whitespace-nowrap">
        Login / Register
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 sm:gap-2 hover:opacity-80"
      >
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground">
          <User size={14} className="sm:w-4 sm:h-4" />
        </div>
        <span className="text-xs sm:text-sm hidden sm:inline">{user.phone}</span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-neutral-400 border-b border-neutral-800">
                <div className="font-medium text-neutral-200">{user.phone}</div>
                {user.name && <div className="mt-1">{user.name}</div>}
                {user.email && <div className="mt-1 text-xs">{user.email}</div>}
              </div>
              <Link
                href="/account"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 rounded"
              >
                <User size={14} />
                My Account
              </Link>
              <Link
                href="/account/profile"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 rounded"
              >
                Edit Profile
              </Link>
              <Link
                href="/orders"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 rounded"
              >
                <Package size={14} />
                My Orders
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 rounded text-left"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

