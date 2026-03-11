import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoryRulesTable = pgTable("category_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  match_type: text("match_type").notNull(),
  match_value: text("match_value").notNull(),
  category_name: text("category_name").notNull(),
  priority: integer("priority").notNull().default(10),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCategoryRuleSchema = createInsertSchema(categoryRulesTable).omit({
  id: true,
  created_at: true,
});

export type InsertCategoryRule = z.infer<typeof insertCategoryRuleSchema>;
export type CategoryRule = typeof categoryRulesTable.$inferSelect;
