import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Dosya yükleme dizini
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'stories');

    const { file, fileName, fileType } = req.body;

    if (!file || !fileName || !fileType) {
      return res.status(400).json({ error: 'Missing required fields: file, fileName, fileType' });
    }

    // Base64 format kontrolü
    if (!file.startsWith('data:')) {
      return res.status(400).json({ error: 'Invalid file format. Expected base64 data URL.' });
    }

    // Dosya tipini kontrol et
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Base64'ten buffer'a çevir
    const base64Data = file.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Buffer geçerliliğini kontrol et
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Invalid file data' });
    }

    // Dosya boyutunu kontrol et (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }

    // Dosya adını güvenli hale getir
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const fileExtension = fileType.split('/')[1];
    const finalFileName = `${timestamp}_${session.user.id}_${safeFileName}`;
    const filePath = join(uploadDir, finalFileName);

    // Dizini oluştur (yoksa)
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (mkdirError) {
      console.error('Directory creation error:', mkdirError);
    }

    // Dosyayı local storage'a yaz
    try {
      await writeFile(filePath, buffer);
    } catch (writeError) {
      console.error('File write error:', writeError);
      return res.status(500).json({ 
        error: 'File write failed',
        details: writeError instanceof Error ? writeError.message : 'Unknown write error'
      });
    }

    // Video süresini hesapla (eğer video ise)
    let duration = null;
    if (fileType.startsWith('video/')) {
      // Bu basit bir implementasyon, gerçek uygulamada ffprobe kullanılabilir
      duration = Math.floor(Math.random() * 60) + 10; // 10-70 saniye arası rastgele
    }

    // Public URL oluştur
    const publicUrl = `/uploads/stories/${finalFileName}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      size: buffer.length,
      duration,
      fileName: finalFileName,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ 
      error: 'File upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
