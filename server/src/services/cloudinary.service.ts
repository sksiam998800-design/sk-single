import { v2 as cloudinary } from 'cloudinary';
import { env, integrations } from '../config/env';
import { AppError } from '../middleware/error.middleware';

if (integrations.cloudinary) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function detectImageTypeFromMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' | 'gif' | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'gif';
  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export async function uploadImageToCloudinary(params: {
  buffer: Buffer;
  folder: string;
  publicIdPrefix?: string;
}): Promise<{ url: string; publicId: string; width: number; height: number; format: string }> {
  if (!integrations.cloudinary) {
    throw new AppError(
      503,
      'CLOUDINARY_UNCONFIGURED',
      'Cloudinary image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.',
    );
  }

  const detected = detectImageTypeFromMagicBytes(params.buffer);
  if (!detected) {
    throw new AppError(400, 'INVALID_IMAGE_FILE', 'Uploaded file is not a valid JPEG, PNG, WEBP, or GIF image.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `novara-commerce/${params.folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        public_id: params.publicIdPrefix ? `${params.publicIdPrefix}-${Date.now()}` : undefined,
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new AppError(502, 'CLOUDINARY_UPLOAD_FAILED', error?.message || 'Cloudinary upload failed.'),
          );
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      },
    );
    stream.end(params.buffer);
  });
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  if (!integrations.cloudinary || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn(`[NOVARA CLOUDINARY] Failed to delete asset ${publicId}:`, err);
  }
}
