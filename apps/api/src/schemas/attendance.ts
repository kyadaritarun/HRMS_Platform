import { z } from 'zod';

export const CheckInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  workMode: z.enum(['WFO', 'WFH', 'HYBRID']).default('WFO'),
  note: z.string().default(''),
});

export const CheckOutSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  note: z.string().default(''),
});
