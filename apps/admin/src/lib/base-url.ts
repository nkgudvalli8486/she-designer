function stripTrailingSlash(url: string) {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Returns an origin/base URL that works in:
 * - Local dev (falls back to localhost)
 * - Vercel (uses VERCEL_URL automatically)
 *
 * You can override with:
 * - ADMIN_BASE_URL (server-only)
 * - NEXT_PUBLIC_ADMIN_BASE_URL (legacy / optional)
 */
export function getAdminBaseUrl() {
	const explicit = process.env.ADMIN_BASE_URL || process.env.NEXT_PUBLIC_ADMIN_BASE_URL;
	if (explicit) return stripTrailingSlash(explicit);

	const vercel = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
	if (vercel) return `https://${vercel}`;

	const port = process.env.PORT ?? '3001';
	return `http://localhost:${port}`;
}


