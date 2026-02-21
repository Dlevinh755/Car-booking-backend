import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8003;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: DATABASE_URL });

function uuid() {
  return crypto.randomUUID();
}

function assertLatLng(p, name) {
  if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") {
    throw new Error(`${name} must have lat,lng as numbers`);
  }
  if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
    throw new Error(`${name} lat/lng out of range`);
  }
}

async function runMigrations() {
  const migrations = ["0001_init.sql", "0002_user_id_text.sql"];
  for (const m of migrations) {
    const file = path.join(process.cwd(), "migrations", m);
    if (fs.existsSync(file)) {
      const sql = fs.readFileSync(file, "utf8");
      await pool.query(sql);
      console.log(`✅ migration applied: ${m}`);
    }
  }
}

// Health
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Create booking
app.post("/bookings", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      userId,
      pickup,
      dropoff,
      vehicleType,
      paymentMethod,
      pricingSnapshot,
    } = req.body || {};

    // For testing, default to 'u1' if not provided
    const finalUserId = userId || "u1";

    assertLatLng(pickup, "pickup");
    assertLatLng(dropoff, "dropoff");

    if (!vehicleType) throw new Error("vehicleType is required");
    if (!paymentMethod) throw new Error("paymentMethod is required");
    if (!pricingSnapshot?.fare || !pricingSnapshot?.distanceM || !pricingSnapshot?.durationS) {
      throw new Error("pricingSnapshot {fare,distanceM,durationS} is required");
    }

    const bookingId = uuid();

    // MVP rule:
    // CASH -> coi như PAID để match luôn (sau sẽ refine)
    // VNPAY -> WAITING_PAYMENT
    const status = paymentMethod === "VNPAY" ? "WAITING_PAYMENT" : "PAID";
    const paymentStatus = paymentMethod === "VNPAY" ? "PENDING" : "NOT_REQUIRED";

    await client.query("BEGIN");

    await client.query(
      `INSERT INTO bookings (
        id, user_id, status, payment_method, payment_status,
        pickup_lat, pickup_lng, pickup_address,
        dropoff_lat, dropoff_lng, dropoff_address,
        vehicle_type, distance_m, duration_s, fare, currency
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,$15,$16
      )`,
      [
        bookingId,
        finalUserId,
        status,
        paymentMethod,
        paymentStatus,
        pickup.lat,
        pickup.lng,
        pickup.address || null,
        dropoff.lat,
        dropoff.lng,
        dropoff.address || null,
        vehicleType,
        pricingSnapshot.distanceM,
        pricingSnapshot.durationS,
        pricingSnapshot.fare,
        pricingSnapshot.currency || "VND",
      ]
    );

    await client.query(
      `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, reason)
       VALUES ($1,$2,$3,$4,$5)`,
      [uuid(), bookingId, null, status, "created"]
    );

    // outbox: BOOKING_CREATED
    await client.query(
      `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        uuid(),
        "BOOKING",
        bookingId,
        "BOOKING_CREATED",
        JSON.stringify({
          bookingId,
          userId: finalUserId,
          status,
          paymentMethod,
          vehicleType,
          pickup,
          dropoff,
          pricingSnapshot,
          createdAt: new Date().toISOString(),
        }),
      ]
    );

    // nếu CASH coi như match luôn => outbox BOOKING_MATCH_REQUESTED
    if (paymentMethod !== "VNPAY") {
      await client.query(
        `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [
          uuid(),
          "BOOKING",
          bookingId,
          "BOOKING_MATCH_REQUESTED",
          JSON.stringify({
            bookingId,
            userId: finalUserId,
            requestedAt: new Date().toISOString(),
            pickup,
            dropoff,
            vehicleType,
            paymentMethod,
            pricingSnapshot,
          }),
        ]
      );
    }

    await client.query("COMMIT");

    res.json({ bookingId, status });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message || "Bad Request" });
  } finally {
    client.release();
  }
});

// Get booking
app.get("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (MVP) Outbox viewer
app.get("/outbox", async (req, res) => {
  const status = req.query.status || "NEW";
  const r = await pool.query(
    "SELECT * FROM outbox_events WHERE status = $1 ORDER BY created_at ASC LIMIT 50",
    [status]
  );
  res.json({ items: r.rows });
});

await runMigrations();

app.listen(PORT, () => {
  console.log(`Booking service running on http://localhost:${PORT}`);
});