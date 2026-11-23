import { existsSync } from "node:fs";
// Helyi futtatáskor a .env betöltése (élesben a környezeti változókat a hoszting adja).
if (existsSync(".env") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env");
