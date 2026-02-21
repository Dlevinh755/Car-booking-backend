import { Kafka } from "kafkajs";
import { Pool } from "pg";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const kafka = new Kafka({
  clientId: "booking-consumer",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || "booking-service" });
const topic = process.env.KAFKA_TOPIC || "taxi.events";

await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

console.log("✅ booking-consumer started");

await consumer.run({
  eachMessage: async ({ message }) => {
    if (!message.value) return;
    const evt = JSON.parse(message.value.toString());

    if (evt.eventType !== "RIDE_ACCEPTED") return;

    const { bookingId, rideId, driverId } = evt.payload;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // idempotent-ish: chỉ update nếu chưa DRIVER_ASSIGNED
      const r = await client.query(
        `UPDATE bookings
         SET status='DRIVER_ASSIGNED', ride_id=$2, updated_at=now()
         WHERE id=$1 AND status IN ('PAID','MATCHING')`,
        [bookingId, rideId]
      );

      if (r.rowCount > 0) {
        await client.query(
          `INSERT INTO booking_status_history(id, booking_id, from_status, to_status, reason)
           VALUES ($1,$2,$3,$4,$5)`,
          [crypto.randomUUID(), bookingId, "PAID", "DRIVER_ASSIGNED", `driver=${driverId}`]
        );
      }

      await client.query("COMMIT");
      console.log(`[BOOKING] updated booking=${bookingId} -> DRIVER_ASSIGNED ride=${rideId}`);
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      console.log("[BOOKING] consume error:", e.message);
    } finally {
      client.release();
    }
  }
});