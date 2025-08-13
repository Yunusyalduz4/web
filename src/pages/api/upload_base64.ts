import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      // Keep under Vercel's request limit; we still compress client-side
      sizeLimit: '6mb',
    },
  },
};

type UploadRequestBody = {
  dataUrl: string;
  filename?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dataUrl, filename }: UploadRequestBody = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ error: 'Invalid dataUrl' });
    }

    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
      return res.status(400).json({ error: 'Malformed dataUrl' });
    }

    const mime = match[1] || 'application/octet-stream';
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');
    // Guard: reject very large payloads
    if (buffer.length > 6 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large. Please upload images under 6MB.' });
    }

    const ext = mime.split('/')[1] || 'bin';
    const safeName = (filename || `upload_${Date.now()}.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');

    // On Vercel, use Blob Storage for large/resilient uploads
    if (process.env.VERCEL) {
      try {
        const fileName = `uploads/${Date.now()}_${safeName}`;
        // Convert Buffer to ArrayBuffer for @vercel/blob
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const blob = await put(fileName, arrayBuffer, {
          access: 'public',
          contentType: mime,
        });
        return res.status(200).json({ url: blob.url });
      } catch (blobErr: any) {
        console.error('upload_base64 blob error:', blobErr?.message || blobErr);
        // Fallback: return data URL so UI can continue without hard failure
        return res.status(200).json({ url: dataUrl });
      }
    }

    // Local/dev: write into public/uploads
    const publicDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const filePath = path.join(publicDir, safeName);
      fs.writeFileSync(filePath, buffer);
      const urlPath = `/uploads/${safeName}`;
      return res.status(200).json({ url: urlPath });
    } catch (writeErr: any) {
      console.error('upload_base64 write error:', writeErr);
      return res.status(500).json({ error: 'Upload failed (write error)' });
    }
  } catch (err: any) {
    console.error('upload_base64 error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}


