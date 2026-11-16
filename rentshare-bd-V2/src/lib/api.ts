const TOKEN_KEY = 'rentshare_bd_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatBdt(amount: number | string | null | undefined): string {
  const n = Math.round(Number(amount) || 0);
  return `৳${n.toLocaleString('en-IN')}`;
}

export function getChatServiceUrl(): string | undefined {
  const configured = (import.meta.env.VITE_CHAT_SERVICE_URL as string | undefined)?.trim();
  if (!configured) return undefined; // Defaults to same-origin Socket.IO gateway on main server
  return configured.replace(/\/+$/, '');
}

export async function uploadImageFile(
  file: File,
  folder = 'rentshare-bd'
): Promise<{ url: string; storage: 'cloudinary' | 'local_fallback' }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  return apiFetch<{ url: string; storage: 'cloudinary' | 'local_fallback' }>('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, folder }),
  });
}
