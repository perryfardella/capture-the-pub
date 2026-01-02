import { SupabaseClient } from "@supabase/supabase-js";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload file to Supabase Storage with real progress tracking using XMLHttpRequest
 */
export async function uploadWithProgress(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ error: Error | null }> {
  try {
    // Get the storage URL and access token from Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Get the Supabase project URL from environment variable
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return { error: new Error("NEXT_PUBLIC_SUPABASE_URL is not configured") };
    }
    
    // For public buckets, use the anon key (available as NEXT_PUBLIC_SUPABASE_ANON_KEY)
    // For authenticated uploads, prefer the session token
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const authToken = session?.access_token || anonKey;
    
    if (!authToken) {
      return { error: new Error("No authentication available") };
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    // Upload using XMLHttpRequest for real progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage,
          });
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) {
            onProgress({
              loaded: file.size,
              total: file.size,
              percentage: 100,
            });
          }
          resolve({ error: null });
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            resolve({
              error: new Error(errorData.error || errorData.message || `Upload failed: ${xhr.statusText}`),
            });
          } catch {
            resolve({
              error: new Error(`Upload failed: ${xhr.statusText} (${xhr.status})`),
            });
          }
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        resolve({ error: new Error("Network error during upload") });
      });

      xhr.addEventListener("abort", () => {
        resolve({ error: new Error("Upload aborted") });
      });

      // Start the upload
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      if (anonKey) {
        xhr.setRequestHeader("apikey", anonKey);
      }

      // Create FormData to match Supabase's expected format
      const formData = new FormData();
      formData.append("file", file);

      xhr.send(formData);
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Upload failed"),
    };
  }
}

