// Public (browser-visible) configuration. Never put secrets in NEXT_PUBLIC_* variables.
// Next.js inlines process.env.NEXT_PUBLIC_* at build time, so each must be read literally.

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local and fill it in.',
  );
}

/** Backend base URL including the version prefix, without a trailing slash. */
export const API_URL = apiUrl.replace(/\/+$/, '');
