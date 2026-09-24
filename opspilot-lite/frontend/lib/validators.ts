import { z } from "zod";
export const askSchema = z.object({ question: z.string().trim().min(3).max(1000) });

