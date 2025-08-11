"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const storage_1 = require("./models/storage");
const consumer_1 = require("./kafka/consumer");
async function main() {
    (0, storage_1.load)();
    const app = (0, server_1.createServer)();
    const server = app.listen(config_1.config.port, () => {
        logger_1.logger.info("API server started", { port: config_1.config.port });
    });
    // start Kafka consumer
    const stopConsumer = await (0, consumer_1.startConsumer)().catch((err) => {
        logger_1.logger.warn("Failed to start consumer", { error: err?.message || err });
        // don't crash; continue exposing API
        return async () => { };
    });
    const shutdown = async () => {
        try {
            logger_1.logger.info("Shutting down");
            await stopConsumer();
            server.close(() => {
                logger_1.logger.info("HTTP server closed");
            });
            (0, storage_1.save)();
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.warn("Error during shutdown", { error: err.message });
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
