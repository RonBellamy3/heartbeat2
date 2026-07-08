/**
 * Confirms a data URL's declared image MIME type matches its actual magic
 * bytes — don't trust the client-supplied prefix alone (defense in depth;
 * these values also get zod-validated for shape/size before reaching here).
 */
export function isValidImageDataUrl(dataUrl: string): boolean {
  const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!match) return false;

  const [, declaredType, base64] = match;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    return false;
  }
  if (bytes.length < 12) return false;

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isWebp =
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";

  if (declaredType === "jpeg") return isJpeg;
  if (declaredType === "png") return isPng;
  if (declaredType === "webp") return isWebp;
  return false;
}
