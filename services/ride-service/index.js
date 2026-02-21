import { Kafka } from "kafkajs";
import { Pool } from "pg";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import axios from "axios";
import express from "express";
import cors from "cors";
import { createClient } from "redis";

/**
 * ENV required (docker-compose):
 * - DATABASE_URL=postgres://taxi:taxi_pass@postgres:5432/ride_db
 * - KAFKA_BROKERS=kafka:9092
 * - KAFKA_TOPIC=taxi.events
 * - KAFKA_GROUP_ID=ride-service
 * - DRIVER_BASE_URL=http://driver-service:8004
 * - REDIS_URL=redis://redis:6379
 * - OFFER_TIMEOUT_SEC=10 (dev) or 60
 * - PORT=8005
 */



const brokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");
const topic = process.env.KAFKA_TOPIC || "taxi.events";
const groupId = process.env.KAFKA_GROUP_ID || "ride-service";
const DRIVER_BASE_URL = process.env.DRIVER_BASE_URL || "http://driver-service:8004";
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const OFFER_TIMEOUT_SEC = Number(process.env.OFFER_TIMEOUT_SEC || 60);
const PORT = Number(process.env.PORT || 8005);

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL missing");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigrations() {
  const dir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await pool.query(sql);
  }
  console.log("✅ ride migrations applied:", files.join(", "));
}

async function alreadyProcessed(eventId) {
  const r = await pool.query("SELECT 1 FROM processed_events WHERE event_id=$1", [eventId]);
  return r.rowCount > 0;
}

async function markProcessed(eventId) {
  await pool.query(
    "INSERT INTO processed_events(event_id) VALUES ($1) ON CONFLICT DO NOTHING",
    [eventId]
  );
}

/** Redis lock */
const rds = createClient({ url: REDIS_URL });
rds.on("error", (e) => console.error("Redis error:", e.message));

const lockKey = (driverId) => `lock:driver:${driverId}`;

async function tryLockDriver(driverId, ttlSec) {
  const ok = await rds.set(lockKey(driverId), "1", { NX: true, EX: ttlSec });
  return ok === "OK";
}
async function unlockDriver(driverId) {
  await rds.del(lockKey(driverId));
}

/** Kafka */
const kafka = new Kafka({ clientId: "ride-service", brokers });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId });

/** Offer next driver based on rides.candidates + rides.candidate_index */
/** Offer next driver based on rides.candidates + rides.candidate_index */
async function offerNextDriver(rideId) {
  const client = await pool.connect();
  let lockedDriverId = null;

  try {
    await client.query("BEGIN");

    const r = await client.query("SELECT * FROM rides WHERE id=$1 FOR UPDATE", [rideId]);
    if (!r.rowCount) throw new Error("ride not found");

    const ride = r.rows[0];
    if (ride.status !== "OFFERING") {
      await client.query("COMMIT");
      return;
    }

    const candidates = ride.candidates || [];
    let idx = ride.candidate_index || 0;

    while (idx < candidates.length) {
      const driverId = candidates[idx].driverId;

      // Try lock driver for offer window only
      const locked = await tryLockDriver(driverId, OFFER_TIMEOUT_SEC + 5);
      if (!locked) {
        idx += 1;
        continue;
      }
      lockedDriverId = driverId;

      // Create offer record
      const offerId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ride_offers(id, ride_id, driver_id, status)
         VALUES ($1,$2,$3,'OFFERED')`,
        [offerId, rideId, driverId]
      );

      const expiresAt = new Date(Date.now() + OFFER_TIMEOUT_SEC * 1000).toISOString();

      // IMPORTANT: move candidate_index to current idx (not +1), next will be idx+1 on timeout/reject
      await client.query(
        `UPDATE rides
         SET current_offer_driver_id=$2,
             offer_expires_at=$3,
             candidate_index=$4,
             updated_at=now()
         WHERE id=$1`,
        [rideId, driverId, expiresAt, idx]
      );

      await client.query("COMMIT");

      // Publish offer event
      const offerEvent = {
        eventId: crypto.randomUUID(),
        eventType: "RIDE_OFFERED_TO_DRIVER",
        aggregateType: "RIDE",
        aggregateId: rideId,
        occurredAt: new Date().toISOString(),
        payload: {
          rideId,
          bookingId: ride.booking_id,
          driverId,
          expiresInSec: OFFER_TIMEOUT_SEC,
        },
      };

      await producer.send({
        topic,
        messages: [{ key: String(ride.booking_id), value: JSON.stringify(offerEvent) }],
      });

      console.log(`[RIDE] Offered ride=${rideId} to driver=${driverId} idx=${idx}`);
      return;
    }

    // No drivers left
    await client.query(`UPDATE rides SET status='NO_DRIVER_FOUND', updated_at=now() WHERE id=$1`, [
      rideId,
    ]);
    await client.query("COMMIT");

    console.log(`[RIDE] NO_DRIVER_FOUND ride=${rideId}`);
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    // If we locked someone but failed before COMMIT, unlock to avoid stale lock
    if (lockedDriverId) {
      try { await unlockDriver(lockedDriverId); } catch {}
    }
    console.error("offerNextDriver error:", e.message);
  } finally {
    client.release();
  }
}

/** Timeout loop: mark offer TIMEOUT -> unlock driver -> offer next */
async function startTimeoutLoop() {
  setInterval(async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, current_offer_driver_id
         FROM rides
         WHERE status='OFFERING'
           AND offer_expires_at IS NOT NULL
           AND offer_expires_at < now()
         LIMIT 20`
      );

      for (const row of rows) {
        const rideId = row.id;
        const driverId = row.current_offer_driver_id;
        if (!driverId) continue;

        await client.query("BEGIN");

        await client.query(
          `UPDATE ride_offers
           SET status='TIMEOUT', responded_at=now()
           WHERE ride_id=$1 AND driver_id=$2 AND status='OFFERED'`,
          [rideId, driverId]
        );

        await client.query(
          `UPDATE rides
           SET current_offer_driver_id=NULL,
               offer_expires_at=NULL,
               candidate_index=candidate_index+1,
               updated_at=now()
           WHERE id=$1 AND status='OFFERING'`,
          [rideId]
        );

        await client.query("COMMIT");

        await unlockDriver(driverId);
        console.log(`[RIDE] TIMEOUT ride=${rideId} driver=${driverId} -> offer next`);
        await offerNextDriver(rideId);
      }
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      console.error("timeout loop error:", e.message);
    } finally {
      client.release();
    }
  }, 2000);
}

/** Express API */
const app = express();
app.use(cors());
app.use(express.json());

function getDriverId(req) {
  const id = req.header("x-driver-id");
  if (!id) throw new Error("Missing x-driver-id header (MVP)");
  return id;
}

app.get("/health", async (req, res) => res.json({ ok: true }));

app.post("/rides/:rideId/driver/accept", async (req, res) => {
  const client = await pool.connect();
  try {
    const rideId = req.params.rideId;
    const driverId = getDriverId(req);

    await client.query("BEGIN");

    const rideR = await client.query("SELECT * FROM rides WHERE id=$1 FOR UPDATE", [rideId]);
    if (!rideR.rowCount) throw new Error("ride not found");
    const ride = rideR.rows[0];

    if (ride.status !== "OFFERING") {
      throw new Error(`ride status not OFFERING (current=${ride.status})`);
    }

    // ✅ Guard: must be the current offered driver
    if (ride.current_offer_driver_id !== driverId) {
      throw new Error("not current offered driver");
    }

    // ✅ Guard: offer not expired
    if (ride.offer_expires_at && new Date(ride.offer_expires_at).getTime() < Date.now()) {
      throw new Error("offer expired");
    }

    const updOffer = await client.query(
      `UPDATE ride_offers
       SET status='ACCEPTED', responded_at=now()
       WHERE ride_id=$1 AND driver_id=$2 AND status='OFFERED'`,
      [rideId, driverId]
    );
    if (updOffer.rowCount === 0) throw new Error("no OFFERED record for this driver");

    await client.query(
      `UPDATE rides
       SET driver_id=$2,
           status='DRIVER_ASSIGNED',
           current_offer_driver_id=NULL,
           offer_expires_at=NULL,
           updated_at=now()
       WHERE id=$1`,
      [rideId, driverId]
    );

    await client.query("COMMIT");

    // ✅ Unlock now: lock is only for OFFERING phase
    await unlockDriver(driverId);

    // ✅ Set driver state to BUSY only after accept
    try {
      await axios.post(
        `${DRIVER_BASE_URL}/internal/drivers/${driverId}/state`,
        { state: "BUSY" },
        { timeout: 2000 }
      );
    } catch (e) {
      console.error(`[RIDE] failed to set driver ${driverId} BUSY:`, e.response?.data || e.message);
    }

    const acceptedEvent = {
      eventId: crypto.randomUUID(),
      eventType: "RIDE_ACCEPTED",
      aggregateType: "RIDE",
      aggregateId: rideId,
      occurredAt: new Date().toISOString(),
      payload: {
        rideId,
        bookingId: ride.booking_id,
        userId: ride.user_id,
        driverId,
      },
    };

    await producer.send({
      topic,
      messages: [{ key: String(ride.booking_id), value: JSON.stringify(acceptedEvent) }],
    });

    res.json({ ok: true, rideId, status: "DRIVER_ASSIGNED" });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post("/rides/:rideId/driver/reject", async (req, res) => {
  const client = await pool.connect();
  try {
    const rideId = req.params.rideId;
    const driverId = getDriverId(req);

    await client.query("BEGIN");

    const rideR = await client.query("SELECT * FROM rides WHERE id=$1 FOR UPDATE", [rideId]);
    if (!rideR.rowCount) throw new Error("ride not found");
    const ride = rideR.rows[0];

    if (ride.status !== "OFFERING") throw new Error(`ride status not OFFERING (current=${ride.status})`);

    await client.query(
      `UPDATE ride_offers
       SET status='REJECTED', responded_at=now()
       WHERE ride_id=$1 AND driver_id=$2 AND status='OFFERED'`,
      [rideId, driverId]
    );

    await client.query(
      `UPDATE rides
       SET current_offer_driver_id=NULL,
           offer_expires_at=NULL,
           candidate_index=candidate_index+1,
           updated_at=now()
       WHERE id=$1 AND status='OFFERING'`,
      [rideId]
    );

    await client.query("COMMIT");

    await unlockDriver(driverId);
    await offerNextDriver(rideId);

    res.json({ ok: true });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post("/rides/:rideId/complete", async (req, res) => {
  const client = await pool.connect();
  try {
    const rideId = req.params.rideId;
    const driverId = getDriverId(req);

    await client.query("BEGIN");
    const r = await client.query("SELECT * FROM rides WHERE id=$1 FOR UPDATE", [rideId]);
    if (!r.rowCount) throw new Error("ride not found");

    const ride = r.rows[0];
    if (ride.driver_id !== driverId) throw new Error("not your ride");

    if (ride.status === "COMPLETED") {
      await client.query("COMMIT");
      return res.json({ ok: true, alreadyCompleted: true });
    }

    await client.query(
      "UPDATE rides SET status='COMPLETED', updated_at=now() WHERE id=$1",
      [rideId]
    );
    await client.query("COMMIT");

    const doneEvent = {
      eventId: crypto.randomUUID(),
      eventType: "RIDE_COMPLETED",
      aggregateType: "RIDE",
      aggregateId: rideId,
      occurredAt: new Date().toISOString(),
      payload: {
        rideId,
        bookingId: ride.booking_id,
        userId: ride.user_id,
        driverId,
      },
    };

    await producer.send({
      topic,
      messages: [{ key: String(ride.booking_id), value: JSON.stringify(doneEvent) }],
    });

    // ✅ Release driver back to ONLINE
    try {
      await axios.post(
        `${DRIVER_BASE_URL}/internal/drivers/${driverId}/state`,
        { state: "ONLINE" },
        { timeout: 3000 }
      );
    } catch (e) {
      console.error(`[RIDE] failed to set driver ${driverId} ONLINE:`, e.response?.data || e.message);
    }

    // ✅ Cleanup lock just in case
    await unlockDriver(driverId);

    res.json({ ok: true });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

/** MAIN */
async function main() {
  await runMigrations();

  await rds.connect();
  console.log("✅ ride-service redis connected");

  await producer.connect();
  console.log("✅ ride-service producer connected");

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  console.log(`✅ ride-service consuming topic=${topic}, group=${groupId}`);

  // Start timeout loop
  startTimeoutLoop();

  // Start API
  app.listen(PORT, () => console.log(`✅ Ride API listening on http://localhost:${PORT}`));

  // Consumer
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const evt = JSON.parse(message.value.toString());
      const eventId = evt.eventId;

      if (!eventId) return; // skip bad message

      // Idempotency guard
      if (await alreadyProcessed(eventId)) {
        // log nhẹ thôi
        // console.log(`[RIDE] skip duplicated ${evt.eventType} eventId=${eventId}`);
        return;
      }

      if (evt.eventType !== "BOOKING_MATCH_REQUESTED") {
        // MVP: ignore other event types
        await markProcessed(eventId);
        return;
      }

      // Handle BOOKING_MATCH_REQUESTED
      try {
        const bookingId = evt.aggregateId;
        const { userId, pickup, vehicleType } = evt.payload || {};
        if (!pickup?.lat || !pickup?.lng || !vehicleType) throw new Error("payload missing pickup/vehicleType");

        // Query nearby drivers
        const resp = await axios.get(`${DRIVER_BASE_URL}/drivers/nearby`, {
          params: {
            lat: pickup.lat,
            lng: pickup.lng,
            radiusM: 3000,
            vehicleType,
            limit: 20,
          },
          timeout: 3000,
        });

        const drivers = resp.data?.drivers || [];

        // Create or reuse ride for this booking (idempotent)
        const client = await pool.connect();
        let rideId;
        try {
          await client.query("BEGIN");

          const existing = await client.query(
            "SELECT id, status FROM rides WHERE booking_id=$1 FOR UPDATE",
            [bookingId]
          );

          if (existing.rowCount > 0) {
            rideId = existing.rows[0].id;
          } else {
            rideId = crypto.randomUUID();
            await client.query(
              `INSERT INTO rides(id, booking_id, user_id, status, candidates, candidate_index)
               VALUES ($1,$2,$3,'OFFERING',$4,0)`,
              [rideId, bookingId, userId || null, JSON.stringify(drivers)]
            );
          }

          // Update latest candidates for this booking
          await client.query(`UPDATE rides SET candidates=$2, updated_at=now() WHERE id=$1`, [
            rideId,
            JSON.stringify(drivers),
          ]);

          if (drivers.length === 0) {
            await client.query(
              `UPDATE rides SET status='NO_DRIVER_FOUND', updated_at=now() WHERE id=$1`,
              [rideId]
            );
            await client.query("COMMIT");
            console.log(`[RIDE] NO_DRIVER_FOUND booking=${bookingId} ride=${rideId}`);
          } else {
            await client.query("COMMIT");
            console.log(`[RIDE] MATCH_REQUEST booking=${bookingId} ride=${rideId} drivers=${drivers.length}`);
            await offerNextDriver(rideId);
          }
        } catch (e) {
          try {
            await client.query("ROLLBACK");
          } catch {}
          throw e;
        } finally {
          client.release();
        }

        // Mark processed only after success
        await markProcessed(eventId);
      } catch (e) {
        console.error("[RIDE] handle BOOKING_MATCH_REQUESTED failed:", e.message);
        // IMPORTANT: do NOT markProcessed here
      }
    },
  });
}

main().catch((e) => {
  console.error("❌ ride-service fatal:", e);
  process.exit(1);
});