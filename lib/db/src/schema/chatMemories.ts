import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const chatMemories = pgTable("chat_memories", {
  id:        serial("id").primaryKey(),
  content:   text("content").notNull(),
  source:    text("source").notNull().default("extracted"), // "extracted" | "manual"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ChatMemory = typeof chatMemories.$inferSelect;
