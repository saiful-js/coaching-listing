import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

export interface UploadedImage {
  publicId: string;
  width: number;
  height: number;
}

export interface UploadOptions {
  folder: string;
}

/**
 * Cloudinary seam (ADR 0004). The service takes a `CloudinaryUploader` so
 * tests inject a fake; production passes the real SDK client. `key`
 * columns store `publicId` (a key, never a URL — PRD §7).
 */
export interface CloudinaryUploader {
  upload(buffer: Buffer, options: UploadOptions): Promise<UploadedImage>;
  destroy(publicId: string): Promise<void>;
}

function configured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

/** Real SDK client. Throws loud when credentials are missing. */
export function getCloudinaryClient(): CloudinaryUploader {
  if (!configured()) {
    throw new Error(
      "Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  return {
    upload: (buffer, options) =>
      new Promise<UploadedImage>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: options.folder, resource_type: "image" },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error("Cloudinary upload failed."));
              return;
            }
            resolve({
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          },
        );
        stream.end(buffer);
      }),
    destroy: async (publicId) => {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    },
  };
}

/**
 * Delivery URL for a stored `public_id`. Transform caps at 1600px wide and
 * lets Cloudinary pick the leanest format (WebP/AVIF where supported).
 */
export function cloudinaryUrl(publicId: string, width = 800): string {
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},c_limit,f_auto,q_auto/${publicId}`;
}
