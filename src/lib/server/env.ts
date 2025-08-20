import { z } from 'zod'

const EnvSchema = z.object({
  DONUT_API_BASE: z.string().min(1).default('https://api.donutsmp.net'),
  DONUT_API_KEY: z.string().min(1, 'DONUT_API_KEY missing - set it on the server').optional(),
  DATABASE_URL: z.string().min(1).optional(),
  MOCK_DONUT_API: z.string().optional()
})

export const env = EnvSchema.parse({
  DONUT_API_BASE: process.env.DONUT_API_BASE,
  DONUT_API_KEY: process.env.DONUT_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  MOCK_DONUT_API: process.env.MOCK_DONUT_API
})

export function assertServerSecrets() {
  if (!process.env.NEXT_RUNTIME) {
    if (!env.DONUT_API_KEY && !env.MOCK_DONUT_API) {
      throw new Error('DONUT_API_KEY is required unless MOCK_DONUT_API is set')
    }
  }
}

