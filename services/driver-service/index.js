import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 8004);
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const HB_TTL_SEC = Number(process.env.HB_TTL_SEC || 60);

const redis = createClient({ url: REDIS_URL });
redis.on("error", (e) => console.error("Redis error:", e.message));
await redis.connect();
import axios from "axios";
const DRIVER_BASE_URL = process.env.DRIVER_BASE_URL || "http://driver-service:8004";

function assertLatLng(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") throw new Error("lat/lng must be numbers");
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error("lat/lng out of range");
}

function geoKey(vehicleType) {
  if (!vehicleType) throw new Error("vehicleType required");
  return `geo:drivers:${vehicleType}`;
}

const hbKey = (driverId) => `driver:hb:${driverId}`;
const stateKey = (driverId) => `driver:state:${driverId}`;
const vehicleKey = (driverId) => `driver:vehicle:${driverId}`;

// MVP auth: lấy driverId từ header (sau thay JWT)
function getDriverId(req) {
  const id = req.header("x-driver-id");
  if (!id) throw new Error("Missing x-driver-id header (MVP)");
  return id;
}

// Health
app.get("/health", async (req, res) => {
  try {
    await redis.ping();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- 1) Set status ONLINE/OFFLINE ---
app.post("/drivers/me/status", async (req, res) => {
  try {
    const driverId = getDriverId(req);
    const { status, vehicleType } = req.body || {};

    if (!["ONLINE", "OFFLINE", "BUSY"].includes(status)) {
      throw new Error("status must be ONLINE|OFFLINE|BUSY");
    }

    // MVP: cho phép truyền vehicleType khi set ONLINE lần đầu
    if (vehicleType) {
      await redis.set(vehicleKey(driverId), vehicleType);
    }
    const vt = await redis.get(vehicleKey(driverId));
    if (!vt && status !== "OFFLINE") {
      throw new Error("vehicleType missing: set it once via body {vehicleType:'CAR_4'}");
    }

    if (status === "OFFLINE") {
      // remove khỏi geo sets (nếu có vt thì remove đúng set, nếu không thì remove cả 2 set)
      const candidates = vt ? [vt] : ["CAR_4", "CAR_7"];
      for (const v of candidates) {
          await redis.sendCommand(["ZREM", geoKey(v), driverId]);
      }
      await redis.set(stateKey(driverId), "OFFLINE");
      await redis.del(hbKey(driverId));
      return res.json({ driverId, status: "OFFLINE" });
    }

    // ONLINE/BUSY: set state + (tuỳ bạn) set TTL state theo heartbeat
    await redis.set(stateKey(driverId), status);
    // chưa có location thì chưa GEOADD; location endpoint sẽ add
    res.json({ driverId, status, vehicleType: vt });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- 2) Update location (requires ONLINE/BUSY) ---
app.post("/drivers/me/location", async (req, res) => {
  try {
    const driverId = getDriverId(req);
    const { lat, lng, accuracyM, ts } = req.body || {};
    assertLatLng(lat, lng);

    const st = await redis.get(stateKey(driverId));
    if (!st || st === "OFFLINE") throw new Error("driver is OFFLINE (set status ONLINE first)");

    const vt = await redis.get(vehicleKey(driverId));
    if (!vt) throw new Error("vehicleType missing (set via /drivers/me/status)");

    // GEOADD: redis expects lng lat
    await redis.geoAdd(geoKey(vt), { longitude: lng, latitude: lat, member: driverId });

    // heartbeat TTL
    await redis.set(hbKey(driverId), "1", { EX: HB_TTL_SEC });

    res.json({
      ok: true,
      driverId,
      vehicleType: vt,
      state: st,
      stored: { lat, lng, accuracyM: accuracyM ?? null, ts: ts ?? null },
      hbTtlSec: HB_TTL_SEC,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- 3) Query nearby drivers (Ride calls this) ---
app.get("/drivers/nearby", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusM = Number(req.query.radiusM || 3000);
    const vehicleType = String(req.query.vehicleType || "");
    const limit = Number(req.query.limit || 20);

    assertLatLng(lat, lng);
    if (!vehicleType) throw new Error("vehicleType required");
    if (!Number.isFinite(radiusM) || radiusM <= 0) throw new Error("radiusM invalid");
    if (!Number.isFinite(limit) || limit <= 0 || limit > 200) throw new Error("limit invalid");

    // Redis GEOSEARCH with distance
    // node-redis v4: use sendCommand for GEOSEARCH
    const raw = await redis.sendCommand([
      "GEOSEARCH",
      geoKey(vehicleType),
      "FROMLONLAT",
      String(lng),
      String(lat),
      "BYRADIUS",
      String(radiusM),
      "m",
      "WITHDIST",
      "ASC",
      "COUNT",
      String(limit),
    ]);

    // raw: [ [member, dist], [member, dist], ... ]
    const pairs = (raw || []).map(([member, dist]) => ({ driverId: member, distanceM: Math.round(Number(dist)) }));

    // Filter by heartbeat + ONLINE state (cheap pipeline)
    const pipeline = redis.multi();
    for (const p of pairs) {
      pipeline.exists(hbKey(p.driverId));
      pipeline.get(stateKey(p.driverId));
    }
    const results = await pipeline.exec(); // array of [exists, state]
    const drivers = [];

    for (let i = 0; i < pairs.length; i++) {
      const existsHb = Number(results[i * 2]) === 1;
      const st = results[i * 2 + 1];
      if (!existsHb) continue;
      if (st !== "ONLINE") continue; // MVP: chỉ match ONLINE (BUSY thì bỏ)
      drivers.push(pairs[i]);
    }

    res.json({ drivers });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// internal: set driver state BUSY/ONLINE quickly (ride-service calls)
app.post("/internal/drivers/:driverId/state", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { state } = req.body || {};
    if (!["ONLINE", "BUSY", "OFFLINE"].includes(state)) {
      throw new Error("state must be ONLINE|BUSY|OFFLINE");
    }
    await redis.set(stateKey(driverId), state);

    res.json({ ok: true, driverId, state });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/drivers/:driverId/debug", async (req, res) => {
  const { driverId } = req.params;
  const vt = await redis.get(vehicleKey(driverId));
  const st = await redis.get(stateKey(driverId));
  const hb = await redis.ttl(hbKey(driverId));
  res.json({ driverId, vehicleType: vt, state: st, hbTtlSec: hb });
});

app.listen(PORT, () => console.log(`Driver service listening on http://localhost:${PORT}`));