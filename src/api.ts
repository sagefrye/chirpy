import { Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError } from "./errors.js"
import { validateHeaderName } from "node:http";

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
    config.api.fileserverHits = 0;
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