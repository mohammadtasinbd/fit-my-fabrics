import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(price);
}

export async function fetchJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Invalid JSON response:', text);
    // If the response is HTML, it's likely a 404 or 500 error page from the server
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
      throw new Error('Server returned an HTML error page instead of JSON. This usually means the API route is missing or the server crashed.');
    }
    throw new Error('Server returned an invalid response format.');
  }
}
