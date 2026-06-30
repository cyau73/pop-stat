// prisma.config.ts
import "dotenv/config"; // This loads your .env file
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    datasource: {
        // This explicitly pulls the variable from your loaded .env
        url: env("DATABASE_URL"),
    },
});