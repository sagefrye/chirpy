import { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "./errors.js"
import { createUser, deleteUsers, getUserByEmail, getUserById, updateUser } from "./db/queries/users.js";
import { createChirp, getChirps, getChirp } from "./db/queries/chirps.js";
import { NewUser, User, NewChirp, Chirp, NewRefreshToken, RefreshToken } from "./db/schema.js";
import { checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT } from "./auth.js";
import { createRefreshToken, getRefreshTokenById, revokeRefreshTokenById } from "./db/queries/tokens.js";

export async function handlerReadiness(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.send('OK');
}

export async function handlerFileserverHits(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/html; charset=utf-8'
    })
    res.send(`<html>
                <body>
                    <h1>Welcome, Chirpy Admin</h1>
                    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
                </body>
            </html>`);
}

export async function handlerReset(req: Request, res: Response): Promise<void> {
    if (config.api.platform !== "dev") {
        throw new ForbiddenError("Cannot reset outside of dev");
    };
    config.api.fileserverHits = 0;
    const deletedUsers = await deleteUsers();
    console.log("deleted the following users:");
    console.log(deletedUsers);
    res.send(`Hits: ${config.api.fileserverHits}`);
}

export async function handlerChirp(req: Request, res: Response) {
    const profaneList = ["kerfuffle", "sharbert", "fornax"];
    
    const token = getBearerToken(req);
    const tokenUser = validateJWT(token, config.api.secret);

    const parsedChirp = req.body;
    
    if (!parsedChirp || typeof parsedChirp.body !== "string") {
        throw new BadRequestError("Invalid JSON");
    };
    if (parsedChirp.body.length > 140) {
        throw new BadRequestError("Chirp is too long. Max length is 140");
    };
    const splitChirp = parsedChirp.body.split(" ");
    splitChirp.forEach((word: string, index: number) => {
        if (profaneList.includes(word.toLowerCase())) {
            splitChirp[index] = "****";
        };
    })
    const newChirp = splitChirp.join(" ");
    const chirp: NewChirp = {
        "body": newChirp,
        "userId": tokenUser
    }

    const respBody = await createChirp(chirp);
    res.header("Content-Type", "application/json");
    res.status(201).send(JSON.stringify(respBody));
}

export async function handlerCreateUser(req: Request, res: Response, next: NextFunction) {
    const parsedBody = req.body;

    if (!parsedBody || typeof parsedBody.email !== "string" || typeof parsedBody.password !== "string") {
        throw new BadRequestError("Invalid JSON");
    };
    if (!parsedBody.email) {
        throw new BadRequestError("Email required for new user creation");
    };
    if (!parsedBody.password) {
        throw new BadRequestError("Password required for new user creation")
    };
    try {
        const newUser: NewUser = {
            email: parsedBody.email,
            hashedPassword: await hashPassword(parsedBody.password)
        };
        const { hashedPassword, ...userWithoutPassword } = await createUser(newUser);
        const respBody = userWithoutPassword;
        res.header("Content-Type", "application/json");
        res.status(201).send(JSON.stringify(respBody));
    } catch (err) {
        next(err);
    }
}

export async function handlerUpdateUser(req: Request, res: Response, next: NextFunction) {
    const parsedBody = req.body;
    
    const token = getBearerToken(req);
    const tokenUser = validateJWT(token, config.api.secret);

    if (!parsedBody || typeof parsedBody.email !== "string" || typeof parsedBody.password !== "string") {
        throw new BadRequestError("Invalid JSON");
    };
    if (!parsedBody.email) {
        throw new BadRequestError("Email required for user update");
    };
    if (!parsedBody.password) {
        throw new BadRequestError("Password required for user update")
    };
    try {
        const currentUser: User = await getUserById(tokenUser);
        const updatedUser: User = {
            id: tokenUser,
            createdAt: currentUser.createdAt,
            updatedAt: currentUser.updatedAt,
            email: parsedBody.email,
            hashedPassword: await hashPassword(parsedBody.password)
        };
        const { hashedPassword, ...userWithoutPassword } = await updateUser(updatedUser);
        const respBody = userWithoutPassword;
        res.header("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(respBody));
    } catch (err) {
        next(err);
    }
}

export async function handlerLogin(req: Request, res: Response, next: NextFunction) {
    const parsedBody = req.body;
    if (!parsedBody || typeof parsedBody.email !== "string" || typeof parsedBody.password !== "string") {
        throw new BadRequestError("Invalid JSON");
    };
    if (!parsedBody.email) {
        throw new BadRequestError("Email required for login");
    };
    if (!parsedBody.password) {
        throw new BadRequestError("Password required for login")
    };
    try {
        const user: User = await getUserByEmail(parsedBody.email);
        const password: string = parsedBody.password;
        if (await checkPasswordHash(password, user.hashedPassword)) {
            const { hashedPassword, ...userWithoutPassword } = user;
            const token = makeJWT(user.id, 3600, config.api.secret);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 60);
            const refreshToken = makeRefreshToken()
            const newRefreshToken: NewRefreshToken = {
                userId: user.id,
                expiresAt: expiresAt,
                token: refreshToken
            };
            await createRefreshToken(newRefreshToken);
            const respBody = {
                ...userWithoutPassword,
                token: token,
                refreshToken: refreshToken,
            };
            res.header("Content-Type", "application/json");
            res.status(200).send(JSON.stringify(respBody));
        } else {
            throw new UnauthorizedError("incorrect email or password");
        }
    } catch (err) {
        next(err);
    }
}

export async function handlerRefresh(req: Request, res: Response, next: NextFunction) {
    const token = getBearerToken(req);
    const refreshToken: RefreshToken = await getRefreshTokenById(token);
    const currentDate: Date = new Date()
    if (refreshToken && refreshToken.expiresAt > currentDate && refreshToken.revokedAt === null) {
        const token = makeJWT(refreshToken.userId, 3600, config.api.secret);
        const respBody = {
            token: token,
        }
        res.header("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(respBody));
    } else {
        throw new UnauthorizedError("refresh token invalid");
    }
}

export async function handlerRevoke(req: Request, res: Response, next: NextFunction) {
    const token = getBearerToken(req);
    const updatedToken = await revokeRefreshTokenById(token);
    if (updatedToken) {
        console.log("revoked the following token");
        console.log(updatedToken);
        res.header("Content-Type", "application/json");
        res.status(204).send();
    } else {
        throw new UnauthorizedError("refresh token invalid")
    }
    
}

export async function handlerGetChirps(req: Request, res: Response, next: NextFunction) {
    const respBody = await getChirps();
    res.header("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(respBody));
}

export async function handlerGetChirp(req: Request, res: Response, next: NextFunction) {
    if (Array.isArray(req.params.chirpId)) {
        throw new BadRequestError("chirpId param can only be one value");
    }
    
    const chirpId: string = req.params.chirpId;
    const respBody: Chirp = await getChirp(chirpId)
    if (!respBody) {
        throw new NotFoundError("chirp not found");
    }
    res.header("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(respBody));
}