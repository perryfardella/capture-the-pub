/**
 * Compress an image file to reduce its size
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @returns Compressed File or original if compression fails
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
  maxSizeMB: number = 5
): Promise<File> {
  // If file is already small enough, return as-is
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxSizeBytes && !file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas and compress
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality setting
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }

            // If still too large, reduce quality further
            if (blob.size > maxSizeBytes && quality > 0.3) {
              compressImage(file, maxWidth, maxHeight, quality - 0.1, maxSizeMB)
                .then(resolve)
                .catch(() => resolve(new File([blob], file.name, { type: file.type })));
            } else {
              const compressedFile = new File([blob], file.name, {
                type: file.type || "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          file.type || "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress a video file by reducing quality/resolution
 * Note: Browser video compression is limited. For better results, consider server-side processing.
 * @param file - The video file to compress
 * @param maxSizeMB - Maximum file size in MB (default: 20)
 * @returns Compressed File or original if compression fails/not needed
 */
export async function compressVideo(
  file: File,
  maxSizeMB: number = 20
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // If file is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  // Browser-based video compression is complex and limited
  // For now, we'll return the original file and let Supabase handle it
  // In production, consider using a service like Cloudinary or server-side FFmpeg
  console.warn(
    `Video file (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds recommended size. ` +
      `Consider compressing on device before upload.`
  );

  return file;
}

/**
 * Compress media file (image or video)
 * @param file - The file to compress
 * @param options - Compression options
 * @returns Compressed File
 */
export async function compressMedia(
  file: File,
  options?: {
    maxImageSizeMB?: number;
    maxVideoSizeMB?: number;
    imageQuality?: number;
    maxImageWidth?: number;
    maxImageHeight?: number;
  }
): Promise<File> {
  if (file.type.startsWith("image/")) {
    return compressImage(
      file,
      options?.maxImageWidth,
      options?.maxImageHeight,
      options?.imageQuality,
      options?.maxImageSizeMB
    );
  } else if (file.type.startsWith("video/")) {
    return compressVideo(file, options?.maxVideoSizeMB);
  }

  // For other file types, return as-is
  return file;
}

