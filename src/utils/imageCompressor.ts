/**
 * Utilidad de compresión y redimensionamiento de imágenes en el cliente (Navegador).
 * Utiliza HTML5 Canvas para reescalar imágenes pesadas (e.g. 5-15MB tomadas con celular)
 * a una resolución óptima para historias/estados (máx 1080x1920) y compresión JPEG al 75%.
 * Esto reduce el peso en ~95-97% (quedando típicamente entre 120KB y 280KB) sin pérdida
 * visual apreciable, ahorrando almacenamiento en Supabase Storage y ancho de banda.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

export async function compressImage(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    quality = 0.75,
    mimeType = 'image/jpeg',
  } = options;

  // Si no es un tipo de imagen conocido, retornar tal cual
  if (file.type && !file.type.startsWith('image/')) {
    if (file instanceof File) return file;
    return new File([file], 'image.jpg', { type: mimeType });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calcular nuevas dimensiones manteniendo aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (file instanceof File) return resolve(file);
        return resolve(new File([file], 'image.jpg', { type: mimeType }));
      }

      // Rellenar fondo blanco por si la imagen original es PNG con transparencia
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) {
            if (file instanceof File) return resolve(file);
            return resolve(new File([file], 'image.jpg', { type: mimeType }));
          }

          const originalName = file instanceof File ? file.name : 'estado.jpg';
          const dotIdx = originalName.lastIndexOf('.');
          const baseName = dotIdx !== -1 ? originalName.substring(0, dotIdx) : originalName;
          const extension = mimeType === 'image/webp' ? '.webp' : '.jpg';
          const newName = `${baseName}${extension}`;

          const compressedFile = new File([blob], newName, {
            type: mimeType,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        mimeType,
        quality
      );
    };

    img.onerror = err => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
