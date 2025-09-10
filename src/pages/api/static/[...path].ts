import { NextApiRequest, NextApiResponse } from 'next';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { extname } from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path: filePath } = req.query;
    
    // Path parametresi array olarak geliyor, join et
    const actualPath = Array.isArray(filePath) ? filePath.join('/') : filePath;
    
    if (!actualPath) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Güvenlik kontrolü - sadece uploads klasöründeki dosyalara erişim
    const safePath = actualPath.replace(/\.\./g, '').replace(/\/+/g, '/');
    const fullPath = join(process.cwd(), 'public', 'uploads', safePath);
    
    console.log('Static file request:', { actualPath, safePath, fullPath });

    // Dosya var mı kontrol et
    try {
      const stats = await stat(fullPath);
      if (!stats.isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Dosyayı oku
    const fileBuffer = await readFile(fullPath);
    
    // Content-Type belirle
    const ext = extname(fullPath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Cache headers
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileBuffer.length);

    return res.status(200).send(fileBuffer);

  } catch (error) {
    console.error('Static file serving error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
