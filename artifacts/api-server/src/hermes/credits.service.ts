/**
 * Hermes Credit System — Hermes Starter Kit (BillBOT+ adaptation)
 *
 * Uses the shared node-postgres Pool exported by @workspace/db, so credits
 * live in the same database as the rest of the app. No extra dependency.
 *
 * Tables required: hermes_credits, hermes_credit_txns
 * Run hermes-kit/db-migration.sql to create them.
 */

import { pool as defaultPool } from "@workspace/db";

type Pool = typeof defaultPool;

export const DEFAULT_ADMIN_CREDITS = 999_999;
export const DEFAULT_USER_CREDITS = 50;
export const CREDITS_PER_MESSAGE = 1;
/** Admins are treated as having unlimited credits; this is the balance reported for them. */
export const ADMIN_INFINITE_BALANCE = Number.MAX_SAFE_INTEGER;

export function makeCreditsService(pool: Pool = defaultPool) {
  async function getOrCreateCredits(userId: string, isAdmin: boolean): Promise<number> {
    if (isAdmin) return ADMIN_INFINITE_BALANCE;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Atomic upsert: RETURNING only yields a row when this call actually inserted it,
      // so the "initial grant" transaction is logged exactly once even under concurrency.
      const { rows: inserted } = await client.query(
        `INSERT INTO hermes_credits (user_id, balance, total_granted, total_used)
         VALUES ($1, $2, $2, 0)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING balance`,
        [userId, DEFAULT_USER_CREDITS],
      );

      let balance: number;
      if (inserted.length > 0) {
        balance = inserted[0].balance;
        await client.query(
          `INSERT INTO hermes_credit_txns (user_id, delta, reason, note, balance_after)
           VALUES ($1, $2, 'user_initial', 'Initial grant', $2)`,
          [userId, DEFAULT_USER_CREDITS],
        );
      } else {
        const { rows } = await client.query(
          "SELECT balance FROM hermes_credits WHERE user_id = $1 LIMIT 1",
          [userId],
        );
        balance = rows[0].balance;
      }
      await client.query("COMMIT");
      return balance;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async function deductCredit(
    userId: string,
    note?: string,
    isAdmin = false,
  ): Promise<{ ok: boolean; balance: number }> {
    // Admins have unlimited credits — never decrement, always allow.
    if (isAdmin) return { ok: true, balance: ADMIN_INFINITE_BALANCE };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT balance FROM hermes_credits WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      if (!rows.length || rows[0].balance < CREDITS_PER_MESSAGE) {
        await client.query("ROLLBACK");
        return { ok: false, balance: rows[0]?.balance ?? 0 };
      }
      const newBalance = rows[0].balance - CREDITS_PER_MESSAGE;
      await client.query(
        `UPDATE hermes_credits
         SET balance = $1, total_used = total_used + $2, updated_at = NOW()
         WHERE user_id = $3`,
        [newBalance, CREDITS_PER_MESSAGE, userId],
      );
      await client.query(
        `INSERT INTO hermes_credit_txns (user_id, delta, reason, note, balance_after)
         VALUES ($1, $2, 'message_sent', $3, $4)`,
        [userId, -CREDITS_PER_MESSAGE, note ?? null, newBalance],
      );
      await client.query("COMMIT");
      return { ok: true, balance: newBalance };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async function grantCredits(
    userId: string,
    amount: number,
    reason: string,
    note?: string,
  ): Promise<{ ok: boolean; balance: number }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO hermes_credits (user_id, balance, total_granted, total_used)
         VALUES ($1, $2, $2, 0)
         ON CONFLICT (user_id) DO UPDATE
         SET balance = hermes_credits.balance + $2,
             total_granted = hermes_credits.total_granted + $2,
             updated_at = NOW()`,
        [userId, amount],
      );
      const { rows } = await client.query(
        "SELECT balance FROM hermes_credits WHERE user_id = $1",
        [userId],
      );
      const newBalance = rows[0].balance;
      await client.query(
        `INSERT INTO hermes_credit_txns (user_id, delta, reason, note, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, amount, reason, note ?? null, newBalance],
      );
      await client.query("COMMIT");
      return { ok: true, balance: newBalance };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async function getCreditHistory(userId: string, limit = 50) {
    const { rows } = await pool.query(
      `SELECT * FROM hermes_credit_txns
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return rows;
  }

  async function getAllCreditAccounts() {
    const { rows } = await pool.query(
      "SELECT * FROM hermes_credits ORDER BY updated_at DESC",
    );
    return rows;
  }

  return { getOrCreateCredits, deductCredit, grantCredits, getCreditHistory, getAllCreditAccounts };
}
