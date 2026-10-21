import { db } from "../index.js";
import { eq } from "drizzle-orm";
import { NewChirp, Chirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp): Promise<Chirp> {
    const [result] = await db
        .insert(chirps)
        .values(chirp)
        .onConflictDoNothing()
        .returning();
    return result;
};

export async function getChirps(): Promise<Chirp[]> {
    const result = await db
        .select()
        .from(chirps)
        .orderBy(chirps.createdAt);
    return result;
};

export async function getChirp(chirpId: string): Promise<Chirp> {
    const [result] = await db
        .select()
        .from(chirps)
        .where(eq(chirps.id, chirpId))
    return result;
}

export async function deleteChirp(chirpId: string): Promise<Chirp> {
    const [result] = await db
        .delete(chirps)
        .where(eq(chirps.id, chirpId))
        .returning();
    return result;
}