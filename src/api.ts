import { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError, ForbiddenError } from "./errors.js"
import { createUser, deleteUsers } from "./db/queries/users.js";
import { type NewUser } from "./db/schema.js";

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

export async function handlerValidate(req: Request, res: Response) {
    type validResponse = {
        "cleanedBody": string;
    };

    const profaneList = ["kerfuffle", "sharbert", "fornax"];
    
    const parsedBody = req.body;
    
    if (!parsedBody || typeof parsedBody.body !== "string") {
        throw new BadRequestError("Invalid JSON");
    };
    if (parsedBody.body.length > 140) {
        throw new BadRequestError("Chirp is too long. Max length is 140");
    }; 
    const splitBody = parsedBody.body.split(" ");
    splitBody.forEach((word: string, index: number) => {
        if (profaneList.includes(word.toLowerCase())) {
            splitBody[index] = "****";
        };
    })
    const newBody = splitBody.join(" ");
    const respBody: validResponse = {
        "cleanedBody": newBody
    }
    res.header("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(respBody));
}

export async function handlerCreateUser(req: Request, res: Response, next: NextFunction) {
    const parsedBody = req.body;

    if (!parsedBody || typeof parsedBody.email !== "string") {
        throw new BadRequestError("Invalid JSON");
    };
    if (!parsedBody.email) {
        throw new BadRequestError("Email required for new user creation");
    };
    try {
        const newUser: NewUser = {
            email: parsedBody.email
        };
        const respBody = await createUser(newUser);
        res.header("Content-Type", "application/json");
        res.status(201).send(JSON.stringify(respBody));
    } catch (err) {
        next(err);
    }
}
