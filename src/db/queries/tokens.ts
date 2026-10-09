import { eq, sql } from "drizzle-orm";
import { db } from "../index.js";
import { NewRefreshToken, refreshTokens } from "../schema.js";

export async function createRefreshToken(token: NewRefreshToken) {
    const [result] = await db
        .insert(refreshTokens)
        .values(token)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function getRefreshTokenById(token: string) {
    const [result] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token))
    return result;
}

export async function revokeRefreshTokenById(token: string) {
    const [result] = await db
        .update(refreshTokens)
        .set( {revokedAt: sql`NOW()` })
        .where(eq(refreshTokens.token, token))
        .returning()
    return result;
}