import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const rootDir = dirname(fileURLToPath(import.meta.url));

for (const candidate of [resolve(rootDir, ".env.local"), resolve(rootDir, "../../.env.local")]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
  }
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
      "@auto-platform/core": resolve(rootDir, "../../packages/core/src/index.ts"),
      "@auto-platform/db": resolve(rootDir, "../../packages/db/src/index.ts"),
      "@auto-platform/types": resolve(rootDir, "../../packages/types/src/index.ts"),
    },
  },
});
