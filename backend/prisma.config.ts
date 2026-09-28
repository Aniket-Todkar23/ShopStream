import { defineConfig } from "prisma/config";
import { PrismaAdapter } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  migrate: {
    url: connectionString,
    async adapter() {
      const pool = new pg.Pool({ connectionString });
      return new PrismaAdapter(pool);
    },
  },
});


