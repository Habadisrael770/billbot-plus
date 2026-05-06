import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id:             uuid("id").primaryKey().defaultRandom(),
  email:          text("email").notNull().unique(),
  passwordHash:   text("password_hash"),
  name:           text("name"),
  avatarUrl:      text("avatar_url"),
  googleId:       text("google_id").unique(),
  isActive:       boolean("is_active").notNull().default(true),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt:    timestamp("last_login_at", { withTimezone: true }),
});

export type User    = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
