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

// ASCII logo for main menu
export const MAIN_MENU_LOGO = [
  "██╗  ██╗",
  " ██╗██╔╝",
  "  ╚███╔╝ ",
  "  ██╔██╗ ",
  " ██╔╝ ██╗",
  " ╚═╝  ╚═╝",
];

// X API Pay-per-use Costs (as of Mar 2026)
// Read endpoints: cost is per resource (tweet/user/event) returned
// Write endpoints: cost is per request
export const API_COSTS: Record<string, number> = {
  // Posts: Read — $0.005/resource
  "tweets/lookup": 0.005,
  "tweets/search/recent": 0.005,
  "users/timeline": 0.005,
  "users/timeline/reverse": 0.005,
  "bookmarks": 0.005,
  // User: Read — $0.010/resource
  "users/me": 0.01,
  "users/followers": 0.01,
  "users/following": 0.01,
  "lists": 0.01,
  // DM Event: Read — $0.010/resource
  "dm/conversations": 0.01,
  "dm/messages": 0.01,
  // Content: Create — $0.010/request
  "tweets/create": 0.01,
  "tweets/delete": 0.01,
  // DM Interaction: Create — $0.015/request
  "dm/send": 0.015,
  // User Interaction: Create — $0.015/request
  "tweets/like": 0.015,
  "tweets/unlike": 0.015,
  "tweets/retweet": 0.015,
  "tweets/unretweet": 0.015,
  "bookmarks/create": 0.015,
  "bookmarks/delete": 0.015,
  "users/follow": 0.015,
  "users/unfollow": 0.015,
  "users/block": 0.015,
  "users/unblock": 0.015,
  "users/mute": 0.015,
  "users/unmute": 0.015,
  "lists/create": 0.01,
  "lists/members/add": 0.015,
  "lists/members/remove": 0.015,
};

// Per-endpoint rate limit config (requests per 15-min window)
export const ENDPOINT_RATE_LIMITS: Record<string, { limit: number; safetyBuffer: number }> = {
  "tweets/delete": { limit: 50, safetyBuffer: 5 },
  "tweets/create": { limit: 100, safetyBuffer: 5 },
  "users/me": { limit: 75, safetyBuffer: 5 },
  "tweets/search/recent": { limit: 60, safetyBuffer: 5 },
  "tweets/lookup": { limit: 300, safetyBuffer: 10 },
  "users/timeline": { limit: 100, safetyBuffer: 5 },
  "bookmarks": { limit: 75, safetyBuffer: 5 },
  "tweets/like": { limit: 100, safetyBuffer: 5 },
  "tweets/unlike": { limit: 100, safetyBuffer: 5 },
  "tweets/retweet": { limit: 100, safetyBuffer: 5 },
  "users/follow": { limit: 100, safetyBuffer: 5 },
  "users/followers": { limit: 75, safetyBuffer: 5 },
  "users/following": { limit: 75, safetyBuffer: 5 },
};

// UI — X.com Chirp design system colors
export const BRAND_COLOR = "#1D9BF0";
export const ERROR_COLOR = "#F4212E";
export const SUCCESS_COLOR = "#00BA7C";
export const WARNING_COLOR = "#FFD400";
export const MUTED_COLOR = "#71767B";
export const COST_COLOR = "#F5A623";
