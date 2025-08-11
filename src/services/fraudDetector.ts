import NodeCache from "node-cache";
import { logger } from "../utils/logger";
import { addFlag, FlaggedTransaction } from "../models/storage";

type Transaction = {
  transactionId: string;
  userId: string;
  amount: number;
  location: string;
  timestamp: string;
};

const dedupeCache = new NodeCache({ stdTTL: 60, checkperiod: 10 });
const lastTxTimes: Map<string, number[]> = new Map();

function isHighAmountOutsideUS(tx: Transaction) {
  return tx.amount > 5000 && tx.location.toLowerCase() !== "usa";
}

function isRoundThousand(tx: Transaction) {
  return tx.amount % 1000 === 0;
}

function isMultipleQuick(tx: Transaction) {
  const now = new Date(tx.timestamp).getTime();
  const arr = lastTxTimes.get(tx.userId) || [];
  // remove old (>30s) entries to keep map small
  const filtered = arr.filter((t) => now - t < 30_000);
  filtered.push(now);
  lastTxTimes.set(tx.userId, filtered);
  // count how many in last 10 seconds (10000 ms)
  const countRecent = filtered.filter((t) => now - t < 10_000).length;
  return countRecent > 1; // more than one within 10s indicates multiple transactions
}

export async function analyzeTransaction(tx: Transaction) {
  if (dedupeCache.get(tx.transactionId)) {
    logger.info("Duplicate transaction skipped by dedupe cache", { transactionId: tx.transactionId });
    return;
  }
  dedupeCache.set(tx.transactionId, true);

  logger.info("Received transaction", { transactionId: tx.transactionId, userId: tx.userId, amount: tx.amount, location: tx.location, timestamp: tx.timestamp });

  const violations: string[] = [];

  if (isHighAmountOutsideUS(tx)) violations.push("HighAmountOutsideUSA");
  if (isMultipleQuick(tx)) violations.push("MultipleTxWithin10s");
  if (isRoundThousand(tx)) violations.push("RoundAmountDivisibleBy1000");

  if (violations.length > 0) {
    for (const rule of violations) {
      const flagged: FlaggedTransaction = {
        transactionId: tx.transactionId,
        userId: tx.userId,
        amount: tx.amount,
        location: tx.location,
        timestamp: tx.timestamp,
        rule,
        flaggedAt: new Date().toISOString()
      };
      addFlag(flagged);
      logger.warn("Fraud detected", { transactionId: tx.transactionId, userId: tx.userId, rule, timestamp: flagged.flaggedAt });
    }
  } else {
    logger.info("No fraud detected", { transactionId: tx.transactionId });
  }
}
