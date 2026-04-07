/**
 * Compress an image file client-side before uploading.
 * Reduces file size to stay under Vercel's 4.5MB body limit.
 * PDFs and SVGs are returned as-is (not compressible this way).
 */
export async function compressImage(
  file: File,
  maxSizeMB = 4,
  maxWidthOrHeight = 2048,
  quality = 0.8
): Promise<File> {
  // Skip non-image files (PDFs, SVGs)
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  // If already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        resolve(file); // Broken image — return original
        return;
      }
      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        if (width > height) {
          height = Math.round((height * maxWidthOrHeight) / width);
          width = maxWidthOrHeight;
        } else {
          width = Math.round((width * maxWidthOrHeight) / height);
          height = maxWidthOrHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compression didn't help, try with lower quality
          if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
            canvas.toBlob(
              (blob2) => {
                if (!blob2 || blob2.size > maxSizeMB * 1024 * 1024) {
                  resolve(file); // Give up, return original
                  return;
                }
                const ext = outputType === "image/png" ? ".png" : ".jpg";
                const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[\/\\]/g, "_").replace(/[^a-zA-Z0-9_\-. ]/g, "_").replace(/_{2,}/g, "_").trim();
                const newName = (baseName || "image") + ext;
                resolve(new File([blob2], newName, { type: outputType }));
              },
              outputType,
              0.5
            );
            return;
          }

          const ext = outputType === "image/png" ? ".png" : ".jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[\/\\]/g, "_").replace(/[^a-zA-Z0-9_\-. ]/g, "_").replace(/_{2,}/g, "_").trim();
          const newName = (baseName || "image") + ext;
          resolve(new File([blob], newName, { type: outputType }));
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}
