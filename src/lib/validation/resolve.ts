import { z } from "zod";

export const resolveAlbumSchema = z.object({
  musicbrainzId: z.string().min(1),
  title: z.string().min(1),
  artistName: z.string().min(1),
  artistMbid: z.string().nullable().optional(),
  releaseYear: z.number().int().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  coverArtUrl: z.string().url().optional(),
  genres: z.array(z.string()).optional(),
});

export const resolveArtistSchema = z.object({
  musicbrainzId: z.string().min(1),
  name: z.string().min(1),
  disambiguation: z.string().nullable().optional(),
});
