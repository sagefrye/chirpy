import { type Request, type Response, type NextFunction } from 'express';
import type { MigrationConfig } from 'drizzle-orm/migrator';

process.loadEnvFile();

const migrationConfig: MigrationConfig = {
    migrationsFolder: "./src/db",
};

type APIConfig = {
    fileserverHits: number;
    platform: string;
};

type DBConfig = {
    dbURL: string;
    migrationConfig: MigrationConfig;
}

type Config = {
    api: APIConfig;
    db: DBConfig;
}

export let config: Config = {
    api: {
        fileserverHits: 0,
        platform: process.env.PLATFORM!
    },
    db: {
        dbURL: process.env.DB_URL!,
        migrationConfig: migrationConfig
    }
};

export function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
    config.api.fileserverHits++;
    next();
}