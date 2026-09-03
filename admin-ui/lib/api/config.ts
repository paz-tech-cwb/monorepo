import { z } from "zod"

const envSchema = z.object({
  apiBaseUrl: z.string().url().default("http://localhost:3001/api"),
  mockEnabled: z.boolean().default(false),
})

function getConfig() {
  const config = envSchema.parse({
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api",
    mockEnabled: process.env.NEXT_PUBLIC_API_MOCK_ENABLED === "true",
  })

  return config
}

export const apiConfig = getConfig()

export type ApiConfig = z.infer<typeof envSchema>
