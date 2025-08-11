import { createServer } from "./server";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { load, save } from "./models/storage";
import { startConsumer } from "./kafka/consumer";

async function main() {
  load();

  const app = createServer();
  const server = app.listen(config.port, () => {
    logger.info("API server started", { port: config.port });
  });

  // start Kafka consumer
  const stopConsumer = await startConsumer().catch((err) => {
    logger.warn("Failed to start consumer", { error: err?.message || err });
    // don't crash; continue exposing API
    return async () => {};
  });

  const shutdown = async () => {
    try {
      logger.info("Shutting down");
      await stopConsumer();
      server.close(() => {
        logger.info("HTTP server closed");
      });
      save();
      process.exit(0);
    } catch (err) {
      logger.warn("Error during shutdown", { error: (err as Error).message });
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error on startup", err);
  process.exit(1);
});
