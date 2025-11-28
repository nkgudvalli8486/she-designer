'use client';

/**
 * Get the auth token from cookies (client-side)
 */
export function getAuthTokenClient(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    // Check for client-readable cookie first, then fallback to auth_token
    if ((name === 'auth_token_client' || name === 'auth_token') && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Get headers with Bearer token for authenticated requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthTokenClient();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

