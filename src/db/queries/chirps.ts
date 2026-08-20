import { db } from "../index.js";
import { NewChirp, Chirp, chirps } from "../schema.js";

export async function createChirp(chirp: NewChirp): Promise<Chirp> {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .onConflictDoNothing()
    .returning();
  return result;
}