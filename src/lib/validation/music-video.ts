import { z } from "zod";

export const createMusicVideoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artistName: z.string().trim().min(1).max(200),
  artistMbid: z.string().nullable().optional(),
  artistId: z.string().nullable().optional(),
  videoUrl: z.string().trim().url().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
});

export const createMusicVideoLogSchema = z.object({
  musicVideoId: z.string().min(1),
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
  reviewText: z.string().trim().max(10000).nullable().optional(),
  watchedOn: z.string().min(1),
});

export const updateMusicVideoLogSchema = z.object({
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
  reviewText: z.string().trim().max(10000).nullable().optional(),
  watchedOn: z.string().min(1).optional(),
});
