/**
 * Cloudinary Upload Utility
 * Free tier: 25GB storage, 25GB bandwidth/month
 * Unsigned uploads — works directly from browser, no server needed
 */

const CLOUD_NAME = "daw0eptv5";
const UPLOAD_PRESET = "darksidex";

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    resource_type: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
}

/**
 * Upload a file to Cloudinary
 * @param file - File to upload
 * @param onProgress - Optional progress callback (0-100)
 * @returns The permanent CDN URL of the uploaded file
 */
export async function uploadToCloudinary(
    file: File,
    onProgress?: (pct: number) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && onProgress) {
                onProgress(Math.round((ev.loaded / ev.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data: CloudinaryResponse = JSON.parse(xhr.responseText);
                    console.log("[Cloudinary] Upload success:", data.secure_url);
                    resolve(data.secure_url);
                } catch {
                    reject(new Error("Invalid response from Cloudinary"));
                }
            } else {
                console.error("[Cloudinary] Upload failed:", xhr.status, xhr.responseText);
                reject(new Error(`Upload failed: ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network error during upload"));
        };

        xhr.open("POST", UPLOAD_URL);
        xhr.send(formData);
    });
}
