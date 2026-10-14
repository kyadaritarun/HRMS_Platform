import multer from 'multer';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || 'portal-hrms';

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; location: string }> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  const location = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
  return { key, location };
}

export async function getS3FileStream(key: string) {
  try {
    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return res;
  } catch (err) {
    return null;
  }
}

export async function getS3PresignedUrl(key: string, expiresIn = 86400): Promise<string | null> {
  if (!isS3Configured()) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (err) {
    console.error('Failed to generate presigned URL:', err);
    return null;
  }
}

export async function deleteFromS3(key: string): Promise<boolean> {
  if (!isS3Configured()) return false;
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error('Failed to delete S3 object:', err);
    return false;
  }
}

// Pure AWS S3 Storage Engine: buffers file in memory and uploads directly to AWS S3 (no local disk storage)
class S3StorageEngine implements multer.StorageEngine {
  private defaultFolder: string;

  constructor(defaultFolder: string = 'uploads') {
    this.defaultFolder = defaultFolder;
  }

  _handleFile(
    req: any,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void
  ): void {
    // If folder is set to 'image' or request points to profile/avatar, save to 'image' folder in S3
    const isProfile =
      this.defaultFolder === 'image' ||
      req.originalUrl?.includes('profile') ||
      req.originalUrl?.includes('avatar') ||
      req.path?.includes('profile') ||
      req.path?.includes('avatar') ||
      req.headers?.['x-upload-folder'] === 'image';

    const folder = isProfile ? 'image' : this.defaultFolder;
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const s3Key = `${folder}/${uniqueFilename}`;

    const chunks: Buffer[] = [];
    file.stream.on('data', (chunk) => chunks.push(chunk));
    file.stream.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      try {
        if (!isS3Configured()) {
          return cb(new Error('AWS S3 credentials are not configured.'));
        }

        // Upload exclusively to AWS S3 (zero local storage)
        const s3Result = await uploadBufferToS3(buffer, s3Key, file.mimetype);
        const location = `/${folder}/${uniqueFilename}`;

        cb(null, {
          filename: uniqueFilename,
          size: buffer.length,
          ...({ location, s3Url: s3Result.location, key: s3Key, folder } as any),
        });
      } catch (err) {
        cb(err);
      }
    });

    file.stream.on('error', (err) => cb(err));
  }

  _removeFile(_req: any, file: Express.Multer.File, cb: (error: Error | null) => void): void {
    if ((file as any).key) {
      deleteFromS3((file as any).key).catch(() => {});
    }
    cb(null);
  }
}

const defaultFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`));
  }
};

const imageOnlyFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, GIF, SVG.`));
  }
};

// 1. General uploads (saved exclusively in AWS S3 'uploads/' folder)
export const upload = multer({
  storage: new S3StorageEngine('uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: defaultFileFilter,
});

// 2. Profile image uploads (saved exclusively in AWS S3 'image/' folder)
export const uploadProfileImage = multer({
  storage: new S3StorageEngine('image'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageOnlyFilter,
});
