import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { config as loadDotenv } from "dotenv";
import { CredentialsSchema, type Credentials } from "./types.js";
import { CONFIG_DIR_NAME, CREDENTIALS_FILENAME, DB_FILENAME } from "./utils/constants.js";

loadDotenv();

function getConfigDir(): string {
  const dir = join(homedir(), ".config", CONFIG_DIR_NAME);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDataDir(): string {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDbPath(): string {
  return join(getDataDir(), DB_FILENAME);
}

export function loadCredentials(): Credentials | null {
  // Try .env first
  const envCreds = {
    appKey: process.env.X_APP_KEY,
    appSecret: process.env.X_APP_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  };

  const envResult = CredentialsSchema.safeParse(envCreds);
  if (envResult.success) return envResult.data;

  // Try config file
  const configPath = join(getConfigDir(), CREDENTIALS_FILENAME);
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8"));
      const fileResult = CredentialsSchema.safeParse(raw);
      if (fileResult.success) return fileResult.data;
    } catch {
      // Invalid config file, ignore
    }
  }

  return null;
}

export function saveCredentials(creds: Credentials): void {
  const configDir = getConfigDir();
  const configPath = join(configDir, CREDENTIALS_FILENAME);
  writeFileSync(configPath, JSON.stringify(creds, null, 2), "utf-8");
  chmodSync(configPath, 0o600);
}

export function hasCredentials(): boolean {
  return loadCredentials() !== null;
}
