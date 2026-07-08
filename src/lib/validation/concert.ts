import { z } from "zod";

export const createConcertSchema = z.object({
  artistName: z.string().trim().min(1).max(200),
  artistMbid: z.string().nullable().optional(),
  artistId: z.string().nullable().optional(),
  venueName: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(200),
  eventDate: z.string().min(1),
  tourName: z.string().trim().max(200).nullable().optional(),
});

export const createConcertLogSchema = z.object({
  concertId: z.string().min(1),
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
  reviewText: z.string().trim().max(10000).nullable().optional(),
  setlistNotes: z.string().trim().max(5000).nullable().optional(),
});

export const updateConcertLogSchema = z.object({
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
  reviewText: z.string().trim().max(10000).nullable().optional(),
  setlistNotes: z.string().trim().max(5000).nullable().optional(),
});
