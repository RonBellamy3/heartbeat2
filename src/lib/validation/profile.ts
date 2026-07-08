import { z } from "zod";

const MAX_DATA_URL_LENGTH = 3_000_000; // ~2.2MB decoded, comfortably covers a compressed JPEG

const imageDataUrl = z
  .string()
  .max(MAX_DATA_URL_LENGTH, "Image is too large")
  .regex(/^data:image\/(jpeg|png|webp);base64,/, "Unsupported image format");

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(300).nullable().optional(),
  avatarUrl: imageDataUrl.nullable().optional(),
  bannerUrl: imageDataUrl.nullable().optional(),
});
