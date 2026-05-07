import { pgTable, uuid, text, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";

export const loyaltyMembers = pgTable("loyalty_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  birthDate: date("birth_date"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  onboardingStep: integer("onboarding_step").default(0),
  whatsappOptIn: boolean("whatsapp_opt_in").default(false),
  whatsappSentAt: timestamp("whatsapp_sent_at", { withTimezone: true }),
  optInAt: timestamp("opt_in_at", { withTimezone: true }),
  contactSavedAt: timestamp("contact_saved_at", { withTimezone: true }),
  notes: text("notes"),
});

export type LoyaltyMember = typeof loyaltyMembers.$inferSelect;
export type NewLoyaltyMember = typeof loyaltyMembers.$inferInsert;
