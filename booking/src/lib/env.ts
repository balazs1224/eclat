// Központi, validált konfiguráció. Titok soha nem kerül a forráskódba — csak környezeti változóból.
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(8).optional(),
  EMAIL_DRIVER: z.enum(["outbox", "smtp"]).default("outbox"),
  EMAIL_FROM: z.string().default("[PLACEHOLDER: feladó]"),
  EMAIL_ADMIN_TO: z.string().default(""),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(["manual"]).default("manual"),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Hiányzó vagy hibás környezeti változó(k): ${fields}. Lásd .env.example`);
  }
  cached = parsed.data;
  return cached;
}
