import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getAppConfig } from '../config/env';

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadResult {
  url: string;
  storage: 'cloudinary' | 'local_fallback';
  mimeType: string;
  sizeBytes: number;
}

export function parseImageDataUrl(dataUrl: string): { mimeType: string; ext: string; buffer: Buffer } {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(
    String(dataUrl || '').trim()
  );
  if (!match) {
    throw new Error('Invalid image payload. Expected a base64 PNG, JPEG, or WebP data URL.');
  }

  const mimeType = match[1].toLowerCase();
  const ext = ALLOWED_MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new Error('Unsupported image format. Please upload PNG, JPEG, or WebP.');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new Error('Image size must be between 1 byte and 5 MB.');
  }

  return { mimeType, ext, buffer };
}

export async function uploadImageAsset(
  dataUrl: string,
  folder = 'rentshare-bd'
): Promise<UploadResult> {
  const { mimeType, ext, buffer } = parseImageDataUrl(dataUrl);
  const cfg = getAppConfig();

  if (cfg.integrations.cloudinary.enabled) {
    const { cloudName, apiKey, apiSecret } = cfg.integrations.cloudinary;
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const form = new FormData();
    form.append('file', dataUrl);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload.error?.message || 'Cloudinary upload failed');
    }

    return {
      url: payload.secure_url,
      storage: 'cloudinary',
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  // Local development image upload fallback when Cloudinary is not configured
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const fullPath = path.join(uploadsDir, fileName);
  fs.writeFileSync(fullPath, buffer);

  return {
    url: `/uploads/${fileName}`,
    storage: 'local_fallback',
    mimeType,
    sizeBytes: buffer.length,
  };
}
