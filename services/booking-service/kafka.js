import { Kafka } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");
export const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "taxi.events";

export function createProducer() {
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "booking-service",
    brokers,
  });
  return kafka.producer();
}