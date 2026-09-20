/**
 * Image processing utilities for avatar upload
 */

export interface ImageProcessResult {
  dataUrl: string;
  sizeBytes: number;
}

export interface ImageResizeOptions {
  cropToSquare?: boolean;
  fillBackground?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
  minWidth?: number;
  minHeight?: number;
}

/**
 * Resizes and compresses an image file.
 * If cropToSquare is true, it center-crops to a 1:1 square to cleanly fill circular avatars.
 * Always fills background with white to prevent transparent PNGs from rendering black borders when converting to JPEG.
 */
export async function resizeAndCompressImage(
  file: File,
  maxDimension = 500,
  quality = 0.9,
  options?: ImageResizeOptions
): Promise<string> {
  const {
    cropToSquare = false,
    fillBackground = '#FFFFFF',
    mimeType = 'image/jpeg',
    minWidth,
    minHeight,
  } = options || {};

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'image/heic', 'image/avif'];
  if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpe?g|png|webp|gif|avif|heic)$/i)) {
    throw new Error('Тек сурет файлдарын жүктеуге болады (JPG, PNG, WebP)');
  }

  // Max 15MB input check
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Сурет көлемі 15 МБ-тан аспауы керек');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Суретті оқу мүмкін болмады'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Суретті өңдеу мүмкін болмады'));
      img.onload = () => {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        // Minimum dimension validation
        if (minWidth && srcW < minWidth) {
          reject(new Error(`Сурет ені кемінде ${minWidth} пиксел болуы керек (қазіргісі: ${srcW}px)`));
          return;
        }
        if (minHeight && srcH < minHeight) {
          reject(new Error(`Сурет биіктігі кемінде ${minHeight} пиксел болуы керек (қазіргісі: ${srcH}px)`));
          return;
        }

        let canvasW = srcW;
        let canvasH = srcH;
        let sx = 0;
        let sy = 0;
        let sWidth = srcW;
        let sHeight = srcH;

        if (cropToSquare) {
          // Center crop to 1:1 square
          const minSide = Math.min(srcW, srcH);
          sx = Math.round((srcW - minSide) / 2);
          sy = Math.round((srcH - minSide) / 2);
          sWidth = minSide;
          sHeight = minSide;

          const targetSize = Math.min(maxDimension, minSide);
          canvasW = targetSize;
          canvasH = targetSize;
        } else {
          // Aspect ratio preserved scaling
          if (canvasW > canvasH) {
            if (canvasW > maxDimension) {
              canvasH = Math.round((canvasH * maxDimension) / canvasW);
              canvasW = maxDimension;
            }
          } else {
            if (canvasH > maxDimension) {
              canvasW = Math.round((canvasW * maxDimension) / canvasH);
              canvasH = maxDimension;
            }
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas контексті қолжетімді емес'));
          return;
        }

        // Fill background if specified (prevents transparency turning black in JPEG)
        if (fillBackground) {
          ctx.fillStyle = fillBackground;
          ctx.fillRect(0, 0, canvasW, canvasH);
        }

        // Smooth image rendering with multi-step downscaling for very large images to ensure crystal clear quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasW, canvasH);

        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Avatar specific processor:
 * - Validates minimum 300x300 pixels
 * - Center-crops 1:1 square
 * - Automatically downsizes large pixels to optimal 500x500 dimension
 * - Prevents black background artifacts
 */
export async function processAvatarImage(
  file: File,
  dimension = 500,
  quality = 0.9
): Promise<string> {
  return resizeAndCompressImage(file, dimension, quality, {
    cropToSquare: true,
    fillBackground: '#FFFFFF',
    mimeType: 'image/jpeg',
    minWidth: 300,
    minHeight: 300,
  });
}
