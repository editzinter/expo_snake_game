import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Forces a hard refresh of the page, clearing the browser cache
 * Useful when experiencing differences between localhost and IP address views
 */
export function forceRefresh() {
  if (typeof window !== 'undefined') {
    // Clear any session/local storage caches if needed
    // sessionStorage.clear();
    
    // Add a cache-busting query parameter
    const cacheBuster = `?cache=${Date.now()}`;
    window.location.href = window.location.pathname + cacheBuster;
  }
}

/**
 * Check if a server URL is reachable
 * @param url URL to check
 * @returns Promise that resolves to true if reachable, false otherwise
 */
export async function isServerReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // This allows checking servers even with CORS restrictions
    });
    
    clearTimeout(timeoutId);
    return true; // If we get here, the server is reachable
  } catch (error) {
    console.error(`Server at ${url} is not reachable:`, error);
    return false;
  }
}
