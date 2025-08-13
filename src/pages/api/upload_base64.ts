import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

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

    const ext = mime.split('/')[1] || 'bin';
    const safeName = (filename || `upload_${Date.now()}.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');

    const publicDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const urlPath = `/uploads/${safeName}`;
    return res.status(200).json({ url: urlPath });
  } catch (err: any) {
    console.error('upload_base64 error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}


