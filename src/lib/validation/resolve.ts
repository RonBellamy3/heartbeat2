import { z } from "zod";

export const resolveAlbumSchema = z.object({
  musicbrainzId: z.string().min(1),
  title: z.string().min(1),
  artistName: z.string().min(1),
  releaseYear: z.number().int().nullable().optional(),
  coverArtUrl: z.string().url().optional(),
  genres: z.array(z.string()).optional(),
});
