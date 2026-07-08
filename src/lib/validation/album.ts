import { z } from "zod";

export const manualAlbumSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  artistName: z.string().trim().min(1, "Artist is required").max(200),
  releaseYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .nullable()
    .optional(),
});

export const createLogSchema = z.object({
  albumId: z.string().min(1, "Album is required"),
  rating: z
    .number()
    .min(0.5)
    .max(5)
    .multipleOf(0.5)
    .nullable()
    .optional(),
  reviewText: z.string().trim().max(10000).nullable().optional(),
  listenedOn: z.string().min(1),
  isRelisten: z.boolean().optional(),
  containsSpoilers: z.boolean().optional(),
});

export const updateLogSchema = z.object({
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
  reviewText: z.string().trim().max(10000).nullable().optional(),
  listenedOn: z.string().min(1).optional(),
  isRelisten: z.boolean().optional(),
  containsSpoilers: z.boolean().optional(),
});
