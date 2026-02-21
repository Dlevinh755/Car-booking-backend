import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Kafka } from "kafkajs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({ origin: "*", credentials: false }));

const PORT = Number(process.env.PORT || 8006);

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});

const topic = process.env.KAFKA_TOPIC || "taxi.events";
const groupId = process.env.KAFKA_GROUP_ID || "notification-service";

const consumer = kafka.consumer({ groupId });

// In-memory connection registry
const userClients = new Map();   // userId -> Set(res)
const driverClients = new Map(); // driverId -> Set(res)

function addClient(map, id, res) {
  if (!map.has(id)) map.set(id, new Set());
  map.get(id).add(res);
}

function removeClient(map, id, res) {
  const set = map.get(id);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) map.delete(id);
}

function sseWrite(res, event, data) {
  // SSE format
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(map, id, event, data) {
  const set = map.get(id);
  if (!set) return;
  for (const res of set) {
    sseWrite(res, event, data);
  }
}

// SSE endpoint
app.get("/notifications/stream", (req, res) => {
  const role = String(req.query.role || "").toUpperCase(); // USER|DRIVER
  const userId = String(req.query.userId || "");
  const driverId = String(req.query.driverId || "");

  if (role !== "USER" && role !== "DRIVER") {
    return res.status(400).json({ error: "role must be USER|DRIVER" });
  }
  if (role === "USER" && !userId) return res.status(400).json({ error: "userId required" });
  if (role === "DRIVER" && !driverId) return res.status(400).json({ error: "driverId required" });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // nếu chạy qua nginx
  res.setHeader("Content-Encoding", "none"); // tránh compression buffering
  res.flushHeaders?.();

  // register
  const id = role === "USER" ? userId : driverId;
  if (role === "USER") addClient(userClients, id, res);
  else addClient(driverClients, id, res);

  // hello + heartbeat (keep-alive)
  sseWrite(res, "hello", { ok: true, role, id, ts: Date.now() });

  const heartbeat = setInterval(() => {
    // comment line to keep connection alive
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    if (role === "USER") removeClient(userClients, id, res);
    else removeClient(driverClients, id, res);
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

// ---- Kafka consume & route events ----
function routeEvent(evt) {
  const { eventType, payload } = evt;

  // 1) driver-side offer
  if (eventType === "RIDE_OFFERED_TO_DRIVER") {
    const driverId = payload?.driverId;
    if (driverId) broadcast(driverClients, String(driverId), "ride_offer", evt);
    return;
  }

  // 2) ride accepted/completed -> send to both (if ids exist)
  if (eventType === "RIDE_ACCEPTED") {
    const driverId = payload?.driverId;
    const userId = payload?.userId; // nếu bạn có, sẽ gửi user
    if (driverId) broadcast(driverClients, String(driverId), "ride_accepted", evt);
    if (userId) broadcast(userClients, String(userId), "ride_accepted", evt);
    return;
  }

  if (eventType === "RIDE_COMPLETED") {
    const driverId = payload?.driverId;
    const userId = payload?.userId;
    if (driverId) broadcast(driverClients, String(driverId), "ride_completed", evt);
    if (userId) broadcast(userClients, String(userId), "ride_completed", evt);
    return;
  }

  // 3) booking updates (khuyến nghị booking publish BOOKING_UPDATED kèm userId)
  if (eventType && eventType.startsWith("BOOKING_")) {
    const userId = payload?.userId;
    if (userId) broadcast(userClients, String(userId), "booking", evt);
    return;
  }

  // 4) payment updates
  if (eventType && eventType.startsWith("PAYMENT_")) {
    const userId = payload?.userId;
    if (userId) broadcast(userClients, String(userId), "payment", evt);
    return;
  }
}

async function startKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  console.log(`✅ notification-service consuming ${topic} group=${groupId}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const evt = JSON.parse(message.value.toString());
        routeEvent(evt);
      } catch (e) {
        console.log("notification parse error:", e.message);
      }
    },
  });
}

app.listen(PORT, () => console.log(`Notification SSE on http://localhost:${PORT}`));
startKafka().catch((e) => console.error("Kafka start error:", e));