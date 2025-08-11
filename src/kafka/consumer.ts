import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { config } from "../utils/config";
import { logger } from "../utils/logger";
import { analyzeTransaction } from "../services/fraudDetector";

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers
});

let consumer: Consumer | null = null;
let running = true;

export async function startConsumer() {
  consumer = kafka.consumer({ groupId: config.kafkaGroupId });
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafkaTopic, fromBeginning: false });

  logger.info("Kafka consumer connected", { brokers: config.kafkaBrokers, topic: config.kafkaTopic });

  // simple in-memory retry queue
  const retryQueue: { payload: EachMessagePayload; attempts: number; nextAttemptAt: number }[] = [];
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
          if (!value) throw new Error("Empty message");
          const tx = JSON.parse(value);
          await analyzeTransaction(tx);
          retryQueue.splice(i, 1);
        } catch (err) {
          item.attempts++;
          if (item.attempts >= MAX_ATTEMPTS) {
            logger.warn("Dropping message after max retry attempts", { attempts: item.attempts, error: (err as Error).message });
            retryQueue.splice(i, 1);
          } else {
            const backoff = Math.pow(2, item.attempts) * 1000;
            item.nextAttemptAt = Date.now() + backoff;
            logger.warn("Retrying message later", { attempts: item.attempts, nextAttemptAt: new Date(item.nextAttemptAt).toISOString() });
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
          logger.warn("Received empty message");
          return;
        }
        const tx = JSON.parse(value);
        // validate minimal schema
        if (!tx.transactionId || !tx.userId || tx.amount == null || !tx.timestamp || !tx.location) {
          logger.warn("Invalid transaction payload, skipping", { payload: value });
          return;
        }
        // process
        await analyzeTransaction(tx);
      } catch (err) {
        logger.warn("Processing error, enqueueing for retry", { error: (err as Error).message });
        retryQueue.push({ payload, attempts: 0, nextAttemptAt: Date.now() + 1000 });
      }
    }
  });

  // graceful stop helper
  const stop = async () => {
    if (!running) return;
    running = false;
    try {
      clearInterval(retryRunner);
      if (consumer) {
        logger.info("Disconnecting Kafka consumer");
        await consumer.disconnect();
      }
    } catch (err) {
      logger.warn("Error during consumer disconnect", { err: (err as Error).message });
    }
  };

  // attach to process close (index.ts will call)
  return stop;
}

export async function stopConsumer() {
  try {
    if (consumer) {
      await consumer.disconnect();
      logger.info("Kafka consumer disconnected");
    }
  } catch (err) {
    logger.warn("Error disconnecting consumer", { error: (err as Error).message });
  }
}
