import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  kafkaBrokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(",") : ["localhost:9092"],
  kafkaClientId: process.env.KAFKA_CLIENT_ID || "fraud-detector",
  kafkaGroupId: process.env.KAFKA_GROUP_ID || "fraud-detector-group",
  kafkaTopic: process.env.KAFKA_TOPIC || "transactions",
  persistenceFile: process.env.PERSISTENCE_FILE || "./data/flagged.json"
};
