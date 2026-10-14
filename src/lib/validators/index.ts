import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const resourceSchema = z.object({
  name: z.string().min(2, "Resource name must be at least 2 characters").max(100),
  categoryId: z.string().uuid("A valid category must be selected"),
  location: z.string().min(2, "Location is required"),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ResourceInput = z.infer<typeof resourceSchema>;

export const updateResourceSchema = resourceSchema.partial();

export const reservationSchema = z
  .object({
    resourceId: z.string().uuid("Invalid resource ID"),
    title: z.string().min(3, "Title must be at least 3 characters").max(120),
    notes: z.string().max(1000).optional().nullable(),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Start time must be a valid ISO date string",
    }),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "End time must be a valid ISO date string",
    }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      return end > start;
    },
    {
      message: "End time must be strictly after start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      // Allow 5 minutes grace period for clock skew or form completion delay
      const nowWithGrace = Date.now() - 5 * 60 * 1000;
      return start >= nowWithGrace;
    },
    {
      message: "Reservations cannot be made in the past",
      path: ["startTime"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      const maxDurationHours = 12;
      return end - start <= maxDurationHours * 60 * 60 * 1000;
    },
    {
      message: "A single reservation cannot exceed 12 hours",
      path: ["endTime"],
    }
  );

export type ReservationInput = z.infer<typeof reservationSchema>;

export const availabilityQuerySchema = z.object({
  resourceId: z.string().uuid("Invalid resource ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be formatted as YYYY-MM-DD"),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
