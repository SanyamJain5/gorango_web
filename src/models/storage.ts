import fs from "fs";
import { logger } from "../utils/logger";
import { config } from "../utils/config";

export type FlaggedTransaction = {
  transactionId: string;
  userId: string;
  amount: number;
  location: string;
  timestamp: string;
  rule: string;
  flaggedAt: string;
};

const filePath = config.persistenceFile;

let flagged: FlaggedTransaction[] = [];

function ensureFile() {
  const dir = require("path").dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
}

export function load() {
  try {
    ensureFile();
    const raw = fs.readFileSync(filePath, "utf8");
    flagged = JSON.parse(raw) as FlaggedTransaction[];
  } catch (err) {
    logger.warn("Could not load flagged file, starting fresh", { err });
    flagged = [];
  }
}

export function save() {
  try {
    fs.writeFileSync(filePath, JSON.stringify(flagged, null, 2));
  } catch (err) {
    logger.warn("Failed to persist flagged transactions", { err });
  }
}

export function addFlag(tx: FlaggedTransaction) {
  flagged.push(tx);
  save();
}

export function getAll() {
  return flagged.slice().reverse(); // newest first
}

export function getByUser(userId: string) {
  return flagged.filter((f) => f.userId === userId).reverse();
}
