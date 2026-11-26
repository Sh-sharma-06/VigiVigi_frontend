import fs from "fs";
import path from "path";

export const HUB_DATA_DIR = fs.existsSync("/home/sushant/vigilant-hub")
  ? "/home/sushant/vigilant-hub"
  : process.cwd();

export const GLOBAL_CORPUS_PATH = path.join(HUB_DATA_DIR, ".global_corpus.json");
export const ALLOWLIST_PATH = path.join(HUB_DATA_DIR, ".org_allowlist.json");
export const FP_REPORTS_PATH = path.join(HUB_DATA_DIR, ".fp_reports.json");
export const API_KEYS_PATH = path.join(HUB_DATA_DIR, ".enterprise_keys.json");
export const INTERCEPTOR_DAEMON_URL = process.env.VIGILANT_DAEMON_URL || "http://127.0.0.1:8090";

export function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    }
  } catch {}
  return fallback;
}

export function writeJsonSafe(filePath: string, data: unknown): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}
