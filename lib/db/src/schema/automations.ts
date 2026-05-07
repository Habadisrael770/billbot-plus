import { pgTable, uuid, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const automationsTable = pgTable("automations", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id").notNull(),
  name:          text("name").notNull(),
  message:       text("message").notNull(),
  channels:      text("channels").notNull().default('["email"]'),
  scheduleType:  text("schedule_type").notNull().default("end_of_month"),
  scheduleDay:   integer("schedule_day").notNull().default(1),
  scheduleHour:  integer("schedule_hour").notNull().default(9),
  isActive:      boolean("is_active").notNull().default(true),
  lastRunAt:     timestamp("last_run_at", { withTimezone: true }),
  nextRunAt:     timestamp("next_run_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Automation    = typeof automationsTable.$inferSelect;
export type NewAutomation = typeof automationsTable.$inferInsert;
