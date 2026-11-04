import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // `server-only` throws outside a React Server Components build; in tests it's a no-op.
    alias: { "server-only": new URL("./src/test/empty.ts", import.meta.url).pathname },
  },
});
