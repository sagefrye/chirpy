import express from "express";
import { handlerFileserverHits, handlerReadiness, handlerReset, handlerValidate } from "./api.js";
import { middlewareLogResponses } from "./middleware.js";
import { middlewareErrorHandler } from "./errors.js";
import { config, middlewareMetricsInc } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";

const app = express();
const PORT = 8080;
const migrationClient = postgres(config.db.dbURL, { max: 1});
await migrate(drizzle(migrationClient), config.db.migrationConfig);

app.use("/app", middlewareMetricsInc);
app.use(express.json());

app.get("/api/healthz", handlerReadiness);
app.get("/admin/metrics", handlerFileserverHits);
app.post("/admin/reset", handlerReset);
app.post("/api/validate_chirp", handlerValidate);

app.use("/app", express.static("./src/app"));
app.use(middlewareLogResponses);
app.use(middlewareErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});