"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    kafkaBrokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(",") : ["localhost:9092"],
    kafkaClientId: process.env.KAFKA_CLIENT_ID || "fraud-detector",
    kafkaGroupId: process.env.KAFKA_GROUP_ID || "fraud-detector-group",
    kafkaTopic: process.env.KAFKA_TOPIC || "transactions",
    persistenceFile: process.env.PERSISTENCE_FILE || "./data/flagged.json"
};
