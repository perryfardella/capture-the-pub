/**
 * Compress an image file to reduce its size while maintaining good quality
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 2560 for better quality)
 * @param maxHeight - Maximum height (default: 2560 for better quality)
 * @param quality - JPEG quality 0-1 (default: 0.85 for better quality)
 * @param maxSizeMB - Maximum file size in MB (default: 10)
 * @returns Compressed File or original if compression fails
 */
export async function compressImage(
  file: File,
  maxWidth: number = 2560,
  maxHeight: number = 2560,
  quality: number = 0.85,
  maxSizeMB: number = 10
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
 * Get video duration in seconds
 * @param file - The video file
 * @returns Duration in seconds
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata"));
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Validate video file (duration and size)
 * @param file - The video file to validate
 * @param maxDurationSeconds - Maximum duration in seconds (default: 60)
 * @param maxSizeMB - Maximum file size in MB (default: 100)
 * @returns Validation result with error message if invalid
 */
export async function validateVideo(
  file: File,
  maxDurationSeconds: number = 60,
  maxSizeMB: number = 100
): Promise<{ valid: boolean; error?: string }> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Video file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`,
    };
  }

  try {
    const duration = await getVideoDuration(file);
    if (duration > maxDurationSeconds) {
      return {
        valid: false,
        error: `Video is too long (${Math.ceil(duration)}s). Maximum duration is ${maxDurationSeconds} seconds.`,
      };
    }
  } catch (err) {
    // If we can't read duration, allow it but warn
    console.warn("Could not read video duration", err);
  }

  return { valid: true };
}

/**
 * Compress a video file by reducing quality/resolution
 * Note: Browser video compression is limited. For better results, consider server-side processing.
 * @param file - The video file to compress
 * @param maxSizeMB - Maximum file size in MB (default: 100 for 1-minute videos)
 * @returns Compressed File or original if compression fails/not needed
 */
export async function compressVideo(
  file: File,
  maxSizeMB: number = 100
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

