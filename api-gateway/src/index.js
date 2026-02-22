import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = Number(process.env.PORT || 8000);

// ── Upstream service URLs ───────────────────────────────────────────────────
const AUTH_URL    = process.env.AUTH_URL    || "http://auth-service:8001";
const BOOKING_URL = process.env.BOOKING_URL || "http://booking-service:8003";
const PRICING_URL = process.env.PRICING_URL || "http://pricing-service:8002";
const DRIVER_URL  = process.env.DRIVER_URL  || "http://driver-service:8004";
const RIDE_URL    = process.env.RIDE_URL    || "http://ride-service:8005";
const NOTIF_URL   = process.env.NOTIF_URL   || "http://notification-service:8006";
const GEO_URL     = process.env.GEO_URL     || "http://geo-service:8007";
const PAYMENT_URL = process.env.PAYMENT_URL || "http://payment-service:8888";

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "api-gateway",
    upstreams: { AUTH_URL, BOOKING_URL, PRICING_URL, DRIVER_URL, RIDE_URL, NOTIF_URL, GEO_URL },
  });
});

// ── Proxy factory ────────────────────────────────────────────────────────────
function proxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: "warn",
    on: {
      error(err, _req, res) {
        console.error(`[GW] proxy error → ${target}:`, err.message);
        if (res && !res.headersSent) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: "upstream unavailable", upstream: target }));
        }
      },
    },
  });
}

// ── SSE proxy (notification-service) ─────────────────────────────────────────
// Must NOT buffer — flush headers immediately so EventSource works
const sseProxy = createProxyMiddleware({
  target: NOTIF_URL,
  changeOrigin: true,
  logLevel: "warn",
  selfHandleResponse: false,
  proxyTimeout: 0,      // disable timeout for long-lived SSE connections
  timeout: 0,
  on: {
    proxyReq(proxyReq, req) {
      // Forward real IP
      const ip = req.socket?.remoteAddress || "";
      proxyReq.setHeader("x-forwarded-for", ip);
    },
    error(err, _req, res) {
      console.error("[GW] SSE proxy error:", err.message);
      if (res && !res.headersSent) {
        res.statusCode = 502;
        res.end("data: {\"error\":\"upstream unavailable\"}\n\n");
      }
    },
  },
});

// ── Route table ──────────────────────────────────────────────────────────────
// auth + internal profile lookups
app.use("/auth",     proxy(AUTH_URL));
app.use("/internal", proxy(AUTH_URL));

// bookings
app.use("/bookings", proxy(BOOKING_URL));

// pricing
app.use("/pricing",  proxy(PRICING_URL));

// driver management
app.use("/drivers",  proxy(DRIVER_URL));

// rides + user ride views (ride-service handles both /rides and /users paths)
app.use("/rides",    proxy(RIDE_URL));
app.use("/users",    proxy(RIDE_URL));

// SSE notifications (must come before generic catch-all)
app.use("/notifications", sseProxy);

// geo / autocomplete
app.use("/geo",      proxy(GEO_URL));

// payment (VNPay etc) — strip /payment prefix before forwarding
app.use("/payment", createProxyMiddleware({
  target: PAYMENT_URL,
  changeOrigin: true,
  pathRewrite: { "^/payment": "" },
  on: {
    error(err, _req, res) {
      console.error(`[GW] proxy error → ${PAYMENT_URL}:`, err.message);
      if (res && !res.headersSent) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: "upstream unavailable", upstream: PAYMENT_URL }));
      }
    },
  },
}));

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway listening on http://0.0.0.0:${PORT}`);
  console.log("  Routes:");
  console.log(`    /auth, /internal  → ${AUTH_URL}`);
  console.log(`    /bookings         → ${BOOKING_URL}`);
  console.log(`    /pricing          → ${PRICING_URL}`);
  console.log(`    /drivers          → ${DRIVER_URL}`);
  console.log(`    /rides, /users    → ${RIDE_URL}`);
  console.log(`    /notifications    → ${NOTIF_URL}  (SSE)`);
  console.log(`    /geo              → ${GEO_URL}`);
  console.log(`    /payment          → ${PAYMENT_URL}`);
});
