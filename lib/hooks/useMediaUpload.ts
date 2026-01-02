import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { compressMedia, validateVideo } from "@/lib/utils/media-compression";
import { uploadWithProgress } from "@/lib/utils/upload";

/**
 * Shared upload configuration - ensures consistency across all uploads
 */
export const UPLOAD_CONFIG = {
  // Image settings
  maxImageSizeMB: 10,
  imageQuality: 0.85,
  maxImageWidth: 2560,
  maxImageHeight: 2560,
  
  // Video settings
  maxVideoSizeMB: 100,
  maxVideoDurationSeconds: 60,
  
  // Storage
  bucket: "evidence" as const,
} as const;

export interface UploadResult {
  mediaUrl: string;
  error: null;
}

export interface UploadError {
  mediaUrl: null;
  error: string;
}

export type UploadResponse = UploadResult | UploadError;

export interface UseMediaUploadOptions {
  onSuccess?: (mediaUrl: string) => void;
  onError?: (error: string) => void;
  onProgress?: (percentage: number) => void;
}

/**
 * Shared hook for consistent media uploads across the app
 * Handles validation, compression, upload, and progress tracking
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMedia = async (
    file: File,
    storagePath: string
  ): Promise<UploadResponse> => {
    // Reset state
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    options.onProgress?.(0);

    try {
      // Validate video files (duration and size)
      if (file.type.startsWith("video/")) {
        const validation = await validateVideo(
          file,
          UPLOAD_CONFIG.maxVideoDurationSeconds,
          UPLOAD_CONFIG.maxVideoSizeMB
        );
        if (!validation.valid) {
          const errorMsg = validation.error || "Invalid video file";
          setError(errorMsg);
          setUploading(false);
          setUploadProgress(null);
          options.onError?.(errorMsg);
          return { mediaUrl: null, error: errorMsg };
        }
      }

      // Compression phase: 0-30% of progress
      // Simulate incremental compression progress
      const compressionSteps = [5, 15, 25, 30];
      let stepIndex = 0;
      let compressionProgressInterval: NodeJS.Timeout | null = null;
      
      compressionProgressInterval = setInterval(() => {
        if (stepIndex < compressionSteps.length) {
          setUploadProgress(compressionSteps[stepIndex]);
          options.onProgress?.(compressionSteps[stepIndex]);
          stepIndex++;
        } else if (compressionProgressInterval) {
          clearInterval(compressionProgressInterval);
          compressionProgressInterval = null;
        }
      }, 150);

      // Compress media file with consistent settings
      let compressedFile: File;
      try {
        compressedFile = await compressMedia(file, {
          maxImageSizeMB: UPLOAD_CONFIG.maxImageSizeMB,
          maxVideoSizeMB: UPLOAD_CONFIG.maxVideoSizeMB,
          imageQuality: UPLOAD_CONFIG.imageQuality,
          maxImageWidth: UPLOAD_CONFIG.maxImageWidth,
          maxImageHeight: UPLOAD_CONFIG.maxImageHeight,
        });
      } catch (err) {
        if (compressionProgressInterval) {
          clearInterval(compressionProgressInterval);
        }
        throw err;
      }

      // Clear interval and set to 30% (compression complete)
      if (compressionProgressInterval) {
        clearInterval(compressionProgressInterval);
      }
      setUploadProgress(30);
      options.onProgress?.(30);

      // Upload phase: 30-100% of progress
      const supabase = createSupabaseBrowserClient();
      const path = `${storagePath}/${Date.now()}-${compressedFile.name}`;

      const { error: uploadError } = await uploadWithProgress(
        supabase,
        UPLOAD_CONFIG.bucket,
        path,
        compressedFile,
        (progress) => {
          // Map upload progress (0-100) to overall progress (30-100)
          const overallProgress = Math.round(30 + (progress.percentage * 0.7));
          setUploadProgress(overallProgress);
          options.onProgress?.(overallProgress);
        }
      );

      if (uploadError) {
        const errorMsg = uploadError.message;
        setError(errorMsg);
        setUploading(false);
        setUploadProgress(null);
        options.onError?.(errorMsg);
        return { mediaUrl: null, error: errorMsg };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(UPLOAD_CONFIG.bucket).getPublicUrl(path);

      // Success
      setUploading(false);
      setUploadProgress(100);
      options.onProgress?.(100);
      options.onSuccess?.(publicUrl);

      return { mediaUrl: publicUrl, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      setUploading(false);
      setUploadProgress(null);
      options.onError?.(errorMsg);
      return { mediaUrl: null, error: errorMsg };
    }
  };

  const reset = () => {
    setError(null);
    setUploadProgress(null);
    setUploading(false);
  };

  const setErrorState = (errorMessage: string) => {
    setError(errorMessage);
    setUploading(false);
    setUploadProgress(null);
    options.onError?.(errorMessage);
  };

  return {
    uploadMedia,
    uploading,
    uploadProgress,
    error,
    reset,
    setError: setErrorState,
  };
}

