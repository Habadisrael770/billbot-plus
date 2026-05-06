// User upsert service — used by both auth routes and gmailOAuth
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function upsertGoogleUser(params: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  googleId?: string | null;
}): Promise<void> {
  const email = params.email.toLowerCase().trim();

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(usersTable)
      .set({
        name:        params.name      ?? undefined,
        avatarUrl:   params.avatarUrl ?? undefined,
        googleId:    params.googleId  ?? undefined,
        lastLoginAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(eq(usersTable.email, email));
  } else {
    await db.insert(usersTable).values({
      email,
      name:        params.name      ?? null,
      avatarUrl:   params.avatarUrl ?? null,
      googleId:    params.googleId  ?? null,
      lastLoginAt: new Date(),
    });
  }
}
