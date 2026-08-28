import { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "./errors.js"
import { createUser, deleteUsers, getUserByEmail } from "./db/queries/users.js";
import { createChirp, getChirps, getChirp } from "./db/queries/chirps.js";
import { NewUser, NewChirp, Chirp, User } from "./db/schema.js";
import { checkPasswordHash, hashPassword } from "./auth.js";

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
    
    const parsedChirp = req.body;
    
    if (!parsedChirp || typeof parsedChirp.body !== "string" || typeof parsedChirp.userId !== "string") {
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
        "userId": parsedChirp.userId
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
            const respBody = userWithoutPassword;
            res.header("Content-Type", "application/json");
            res.status(200).send(JSON.stringify(respBody));
        } else {
            throw new UnauthorizedError("incorrect email or password");
        }
    } catch (err) {
        next(err);
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