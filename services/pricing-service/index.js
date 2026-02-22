import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8002;
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

// Rule giá MVP (bạn chỉnh sau)
const PRICING_RULES = {
  CAR_4: { base: 12000, perKm: 8000, perMin: 0, minFare: 25000, surge: 1.0 },
  CAR_7: { base: 15000, perKm: 10000, perMin: 0, minFare: 30000, surge: 1.0 },
};

function assertLatLng(p, name) {
  if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") {
    throw new Error(`${name} must have lat,lng as numbers`);
  }
  if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
    throw new Error(`${name} lat/lng out of range`);
  }
}

async function getRouteOSRM(pickup, dropoff) {
  // OSRM expects "lng,lat;lng,lat"
  const coords = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM error: ${res.status}`);
  }
  const data = await res.json();
  if (!data.routes?.length) throw new Error("OSRM: no route found");
  const r = data.routes[0];
  return { distanceM: Math.round(r.distance), durationS: Math.round(r.duration) };
}

function calcFare(vehicleType, distanceM, durationS) {
  const rule = PRICING_RULES[vehicleType];
  if (!rule) throw new Error("Unsupported vehicleType");

  const km = distanceM / 1000;
  const minutes = durationS / 60;

  const raw = (rule.base + rule.perKm * km + rule.perMin * minutes) * rule.surge;
  const fare = Math.max(rule.minFare, Math.round(raw / 1000) * 1000); // làm tròn 1k

  return {
    fare,
    currency: "VND",
    breakdown: {
      base: rule.base,
      perKm: rule.perKm,
      perMin: rule.perMin,
      minFare: rule.minFare,
      surge: rule.surge,
    },
  };
}

/**
 * Haversine straight-line distance in metres.
 * Multiply by road factor (~1.35 urban) for estimated route distance.
 */
function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return Math.round(2 * R * Math.asin(Math.sqrt(c)));
}

function estimateByHaversine(pickup, dropoff) {
  const straight = haversineM(pickup, dropoff);
  const distanceM = Math.round(straight * 1.35); // road factor
  const speedMps = 30 / 3.6;                     // 30 km/h urban average
  const durationS = Math.round(distanceM / speedMps);
  return { distanceM, durationS, estimated: true };
}

app.post("/pricing/estimate", async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType = "CAR_4" } = req.body || {};
    assertLatLng(pickup, "pickup");
    assertLatLng(dropoff, "dropoff");

    let distanceM, durationS, routeSource;
    try {
      ({ distanceM, durationS } = await getRouteOSRM(pickup, dropoff));
      routeSource = "osrm";
    } catch (osrmErr) {
      console.warn("[PRICING] OSRM failed, using Haversine fallback:", osrmErr.message);
      ({ distanceM, durationS } = estimateByHaversine(pickup, dropoff));
      routeSource = "haversine";
    }

    const { fare, currency, breakdown } = calcFare(vehicleType, distanceM, durationS);

    res.json({
      distanceM,
      durationS,
      fare,
      currency,
      breakdown,
      routeSource,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Bad Request" });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Pricing service running on http://localhost:${PORT}`);
});