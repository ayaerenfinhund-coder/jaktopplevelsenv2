/**
 * Image compression and optimization utilities
 * Compresses images before upload to reduce bandwidth and storage
 */

interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
}

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as Blob
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<Blob> {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Enable image smoothing for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    `image/${format}`,
                    quality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Generate a thumbnail from an image
 * @param file - The image file
 * @param size - Thumbnail size (square)
 * @returns Thumbnail as Blob
 */
export async function generateThumbnail(
    file: File,
    size: number = 200
): Promise<Blob> {
    return compressImage(file, {
        maxWidth: size,
        maxHeight: size,
        quality: 0.7,
        format: 'jpeg'
    });
}

/**
 * Convert image to WebP format (best compression)
 * @param file - The image file
 * @returns WebP image as Blob
 */
export async function convertToWebP(file: File): Promise<Blob> {
    return compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'webp'
    });
}

/**
 * Get image dimensions without loading the full image
 * @param file - The image file
 * @returns Image dimensions
 */
export async function getImageDimensions(
    file: File
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Validate image file
 * @param file - The file to validate
 * @param maxSize - Maximum file size in bytes (default 10MB)
 * @returns Validation result
 */
export function validateImage(
    file: File,
    maxSize: number = 10 * 1024 * 1024
): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'Filen må være et bilde' };
    }

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        return { valid: false, error: `Bildet må være mindre enn ${maxSizeMB}MB` };
    }

    return { valid: true };
}
