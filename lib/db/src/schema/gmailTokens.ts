import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const gmailTokens = pgTable("gmail_tokens", {
  id:           serial("id").primaryKey(),
  email:        text("email").notNull(),
  accessToken:  text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt:    timestamp("expires_at").notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});
