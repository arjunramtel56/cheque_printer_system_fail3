/**
 * Content-sniffing for uploaded images.
 *
 * Both upload endpoints (template images, payment proofs) used to trust a
 * browser-supplied Content-Type. That value is client-controlled, so claim
 * mismatches were only caught after the file was on disk. This module reads
 * the file's own magic numbers and derives both the effective type and a
 * safe extension from it, so anything claiming to be one thing while
 * containing another (e.g. HTML with script, a polyglot) is rejected or
 * renamed to its true type before it is stored or served.
 */

export interface SniffedImage {
  type: string;
  ext: string;
}

/**
 * Returns the detected image type + extension from magic bytes, or null when
 * the buffer does not match any allowed image format.
 *
 * Allowed formats (matches both upload endpoints' existing allowlist):
 *   PNG, JPEG, GIF (87a/89a), and WebP (RIFF container with WEBP BRAND).
 */
export function sniffImage(buffer: Buffer): SniffedImage | null {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { type: "image/png", ext: "png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }

  // GIF: G I F 8 (7|9) a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    buffer[4] === 0x37 &&
    buffer[5] === 0x61
  ) {
    return { type: "image/gif", ext: "gif" };
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    buffer[4] === 0x39 &&
    buffer[5] === 0x61
  ) {
    return { type: "image/gif", ext: "gif" };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { type: "image/webp", ext: "webp" };
  }

  return null;
}
