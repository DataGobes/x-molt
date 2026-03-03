// X API Free Tier Limits
export const TWEET_CHAR_LIMIT = 280;
export const MONTHLY_POST_LIMIT = 1500;
export const DELETE_RATE_LIMIT = 50; // per 15-min window
export const DELETE_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const DELETE_SAFETY_BUFFER = 5;
export const EFFECTIVE_DELETE_LIMIT = DELETE_RATE_LIMIT - DELETE_SAFETY_BUFFER; // 45

// App metadata
export const APP_NAME = "x-molt";
export const APP_VERSION = "1.0.0";
export const CONFIG_DIR_NAME = "x-molt";
export const DB_FILENAME = "archive.db";
export const CREDENTIALS_FILENAME = "credentials.json";

// UI
export const BRAND_COLOR = "#1DA1F2";
export const ERROR_COLOR = "#E0245E";
export const SUCCESS_COLOR = "#17BF63";
export const WARNING_COLOR = "#FFAD1F";
export const MUTED_COLOR = "#8899A6";
