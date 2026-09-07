import * as argon2 from "argon2";
import jwt from "jsonwebtoken"
import type { JwtPayload } from "jsonwebtoken";
import { UnauthorizedError } from "./errors.js";

export async function hashPassword(password: string): Promise<string> {
    const hashedPassword = await argon2.hash(password);
    return hashedPassword;
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, password);
}

type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    const iat = Math.floor(Date.now() / 1000);
    const payload: Payload = {
        iss: "chirpy",
        sub: userID,
        iat: iat,
        exp: iat + expiresIn
    }
    return jwt.sign(payload, secret)
}

export function validateJWT(tokenString: string, secret: string): string {
    try {
        const token: JwtPayload = jwt.verify(tokenString, secret) as JwtPayload;
        if (token.sub === undefined) {
            throw new UnauthorizedError("unauthorized")
        };
        return token.sub;
    } catch {
        throw new UnauthorizedError("unauthorized");
    }
}