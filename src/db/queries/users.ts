import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { NewUser, User, users } from "../schema.js";

export async function createUser(user: NewUser) {
    const [result] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function updateUser(user: User) {
    const [result] = await db
        .update(users)
        .set({email: user.email, hashedPassword: user.hashedPassword})
        .where(eq(users.id, user.id))
        .returning();
    return result;
}

export async function deleteUsers() {
    const result = await db.delete(users).returning();
    return result;
}

export async function getUserByEmail(email: string) {
    const [result] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
    return result;
}

export async function getUserById(id: string) {
    const [result] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
    return result;
}