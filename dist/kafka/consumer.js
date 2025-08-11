"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startConsumer = startConsumer;
exports.stopConsumer = stopConsumer;
const kafkajs_1 = require("kafkajs");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const fraudDetector_1 = require("../services/fraudDetector");
const kafka = new kafkajs_1.Kafka({
    clientId: config_1.config.kafkaClientId,
    brokers: config_1.config.kafkaBrokers
});
let consumer = null;
let running = true;
async function startConsumer() {
    consumer = kafka.consumer({ groupId: config_1.config.kafkaGroupId });
    await consumer.connect();
    await consumer.subscribe({ topic: config_1.config.kafkaTopic, fromBeginning: false });
    logger_1.logger.info("Kafka consumer connected", { brokers: config_1.config.kafkaBrokers, topic: config_1.config.kafkaTopic });
    // simple in-memory retry queue
    const retryQueue = [];
    const MAX_ATTEMPTS = 5;
    // background retry runner
    const retryRunner = setInterval(async () => {
        const now = Date.now();
        for (let i = retryQueue.length - 1; i >= 0; i--) {
            const item = retryQueue[i];
            if (item.nextAttemptAt <= now) {
                try {
                    const message = item.payload.message;
                    const value = message.value?.toString();
                    if (!value)
                        throw new Error("Empty message");
                    const tx = JSON.parse(value);
                    await (0, fraudDetector_1.analyzeTransaction)(tx);
                    retryQueue.splice(i, 1);
                }
                catch (err) {
                    item.attempts++;
                    if (item.attempts >= MAX_ATTEMPTS) {
                        logger_1.logger.warn("Dropping message after max retry attempts", { attempts: item.attempts, error: err.message });
                        retryQueue.splice(i, 1);
                    }
                    else {
                        const backoff = Math.pow(2, item.attempts) * 1000;
                        item.nextAttemptAt = Date.now() + backoff;
                        logger_1.logger.warn("Retrying message later", { attempts: item.attempts, nextAttemptAt: new Date(item.nextAttemptAt).toISOString() });
                    }
                }
            }
        }
    }, 1000);
    await consumer.run({
        eachMessage: async (payload) => {
            const { topic, partition, message } = payload;
            try {
                const value = message.value?.toString();
                if (!value) {
                    logger_1.logger.warn("Received empty message");
                    return;
                }
                const tx = JSON.parse(value);
                // validate minimal schema
                if (!tx.transactionId || !tx.userId || tx.amount == null || !tx.timestamp || !tx.location) {
                    logger_1.logger.warn("Invalid transaction payload, skipping", { payload: value });
                    return;
                }
                // process
                await (0, fraudDetector_1.analyzeTransaction)(tx);
            }
            catch (err) {
                logger_1.logger.warn("Processing error, enqueueing for retry", { error: err.message });
                retryQueue.push({ payload, attempts: 0, nextAttemptAt: Date.now() + 1000 });
            }
        }
    });
    // graceful stop helper
    const stop = async () => {
        if (!running)
            return;
        running = false;
        try {
            clearInterval(retryRunner);
            if (consumer) {
                logger_1.logger.info("Disconnecting Kafka consumer");
                await consumer.disconnect();
            }
        }
        catch (err) {
            logger_1.logger.warn("Error during consumer disconnect", { err: err.message });
        }
    };
    // attach to process close (index.ts will call)
    return stop;
}
async function stopConsumer() {
    try {
        if (consumer) {
            await consumer.disconnect();
            logger_1.logger.info("Kafka consumer disconnected");
        }
    }
    catch (err) {
        logger_1.logger.warn("Error disconnecting consumer", { error: err.message });
    }
}
