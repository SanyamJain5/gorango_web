"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTransaction = analyzeTransaction;
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = require("../utils/logger");
const storage_1 = require("../models/storage");
const dedupeCache = new node_cache_1.default({ stdTTL: 60, checkperiod: 10 });
const lastTxTimes = new Map();
function isHighAmountOutsideUS(tx) {
    return tx.amount > 5000 && tx.location.toLowerCase() !== "usa";
}
function isRoundThousand(tx) {
    return tx.amount % 1000 === 0;
}
function isMultipleQuick(tx) {
    const now = new Date(tx.timestamp).getTime();
    const arr = lastTxTimes.get(tx.userId) || [];
    // remove old (>30s) entries to keep map small
    const filtered = arr.filter((t) => now - t < 30000);
    filtered.push(now);
    lastTxTimes.set(tx.userId, filtered);
    // count how many in last 10 seconds (10000 ms)
    const countRecent = filtered.filter((t) => now - t < 10000).length;
    return countRecent > 1; // more than one within 10s indicates multiple transactions
}
async function analyzeTransaction(tx) {
    if (dedupeCache.get(tx.transactionId)) {
        logger_1.logger.info("Duplicate transaction skipped by dedupe cache", { transactionId: tx.transactionId });
        return;
    }
    dedupeCache.set(tx.transactionId, true);
    logger_1.logger.info("Received transaction", { transactionId: tx.transactionId, userId: tx.userId, amount: tx.amount, location: tx.location, timestamp: tx.timestamp });
    const violations = [];
    if (isHighAmountOutsideUS(tx))
        violations.push("HighAmountOutsideUSA");
    if (isMultipleQuick(tx))
        violations.push("MultipleTxWithin10s");
    if (isRoundThousand(tx))
        violations.push("RoundAmountDivisibleBy1000");
    if (violations.length > 0) {
        for (const rule of violations) {
            const flagged = {
                transactionId: tx.transactionId,
                userId: tx.userId,
                amount: tx.amount,
                location: tx.location,
                timestamp: tx.timestamp,
                rule,
                flaggedAt: new Date().toISOString()
            };
            (0, storage_1.addFlag)(flagged);
            logger_1.logger.warn("Fraud detected", { transactionId: tx.transactionId, userId: tx.userId, rule, timestamp: flagged.flaggedAt });
        }
    }
    else {
        logger_1.logger.info("No fraud detected", { transactionId: tx.transactionId });
    }
}
