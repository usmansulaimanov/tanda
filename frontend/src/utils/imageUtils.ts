/**
 * Image processing utilities for avatar upload
 */

export interface ImageProcessResult {
  dataUrl: string;
  sizeBytes: number;
}

/**
 * Resizes and compresses an image file to a lightweight JPEG Base64 data URL
 * suitable for localStorage and fast profile rendering.
 */
export async function resizeAndCompressImage(
  file: File,
  maxDimension = 400,
  quality = 0.85
): Promise<string> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'image/heic', 'image/avif'];
  if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpe?g|png|webp|gif|avif|heic)$/i)) {
    throw new Error('Тек сурет файлдарын жүктеуге болады (JPG, PNG, WebP)');
  }

  // Max 10MB input check
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Сурет көлемі 10 МБ-тан аспауы керек');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Суретті оқу мүмкін болмады'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Суретті өңдеу мүмкін болмады'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio preserved dimensions (square bounding box)
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas контексті қолжетімді емес'));
          return;
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
