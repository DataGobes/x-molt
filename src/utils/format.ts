import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "MMM d, yyyy");
  } catch {
    // X archive uses a different date format: "Tue Oct 10 12:34:56 +0000 2023"
    try {
      const date = new Date(dateStr);
      return format(date, "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  }
}

export function formatRelative(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getMonthName(month: string): string {
  const idx = parseInt(month, 10) - 1;
  return MONTH_NAMES[idx] ?? month;
}

export function parseTweetDate(dateStr: string): Date {
  // X archive format: "Tue Oct 10 12:34:56 +0000 2023"
  return new Date(dateStr);
}
