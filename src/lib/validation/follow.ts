import { z } from "zod";

export const followSchema = z.object({
  username: z.string().min(1),
});
