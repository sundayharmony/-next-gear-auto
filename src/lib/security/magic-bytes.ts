/** Validate file magic bytes against declared MIME type. */
export function validateImageOrPdfMagicBytes(
  buffer: Buffer,
  mimeType: string,
): boolean {
  if (buffer.length < 4) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;
  const isPdf =
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46;

  switch (mimeType) {
    case "image/jpeg":
      return isJpeg;
    case "image/png":
      return isPng;
    case "image/webp":
      return isWebp;
    case "application/pdf":
      return isPdf;
    default:
      return false;
  }
}
