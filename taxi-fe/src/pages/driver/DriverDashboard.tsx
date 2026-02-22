import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useSSE } from "../../sse/useSSE";
import { Timeline } from "../../components/Timeline";
import { getMyDriverState, setStatus, updateLocation } from "../../api/driver";
import { getCurrentRide, acceptRide, rejectRide, completeRide, pickupPassenger, getDriverRideHistory } from "../../api/ride";
import { getProfile, updateProfile, getInternalUserProfile } from "../../api/auth";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";

export function DriverDashboard() {
  const { token, logout, driverId } = useAuth();
  const { connected, events, clear } = useSSE(token, true);
  const { loading: geoLoading, error: geoError, getCurrentLocation } = useCurrentLocation();

  // Profile state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileVehicleType, setProfileVehicleType] = useState("CAR_4");
  const [profileLicensePlate, setProfileLicensePlate] = useState("");
  const [profileDriverLicense, setProfileDriverLicense] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [vehicleType, setVehicleType] = useState("CAR_4");
  const [status, setSt] = useState<"ONLINE" | "OFFLINE" | "BUSY">("OFFLINE");
  const [lat, setLat] = useState("10.762622");
  const [lng, setLng] = useState("106.660172");
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [currentRideInfo, setCurrentRideInfo] = useState<{
    bookingId?: string;
    pickup?: { lat: number; lng: number; address?: string | null } | null;
    dropoff?: { lat: number; lng: number; address?: string | null } | null;
    fare?: number | null;
    distanceM?: number | null;
    durationS?: number | null;
    currency?: string;
    userProfile?: { full_name?: string | null; phone?: string | null } | null;
  } | null>(null);
  // DRIVER_ASSIGNED = heading to pickup, PICKED_UP = passenger on board
  const [rideStatus, setRideStatus] = useState<"DRIVER_ASSIGNED" | "PICKED_UP" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rideCancelledMsg, setRideCancelledMsg] = useState<string | null>(null);
  // Ride IDs that have been accepted/rejected/completed — permanently hidden from offer panel
  const [dismissedRideIds, setDismissedRideIds] = useState<Set<string>>(new Set());
  // Offer restored from API on page load (SSE event is gone after refresh)
  const [restoredOffer, setRestoredOffer] = useState<{
    payload: {
      rideId: string;
      bookingId: string;
      expiresInSec: number;
      pickup?: { lat: number; lng: number; address?: string | null } | null;
      dropoff?: { lat: number; lng: number; address?: string | null } | null;
      fare?: number | null;
      distanceM?: number | null;
      durationS?: number | null;
      currency?: string;
      userProfile?: { full_name?: string | null; phone?: string | null } | null;
    }
  } | null>(null);
  // Ref to track which SSE events we've already processed (prevent re-firing on reconnect)
  const lastProcessedEventTsRef = useRef<number>(0);
  // Timer ref for auto-expiring the current offer
  const offerExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Completed ride history (loaded on mount + appended when completing a ride)
  const [completedRides, setCompletedRides] = useState<Array<{
    rideId: string;
    bookingId: string;
    completedAt: string;
    pickupLabel?: string;
    dropoffLabel?: string;
    fare?: number;
    currency?: string;
  }>>([]); 

  function dismissOffer(rideId: string) {
    setDismissedRideIds((prev) => new Set([...prev, rideId]));
    // Also clear restoredOffer if it matches
    setRestoredOffer((prev) => (prev?.payload?.rideId === rideId ? null : prev));
  }

  // Cleanup offer expire timer on unmount
  useEffect(() => {
    return () => {
      if (offerExpireTimerRef.current) clearTimeout(offerExpireTimerRef.current);
    };
  }, []);

  // Auto-restore previous state (valid for 30 minutes)
  useEffect(() => {
    async function loadPreviousState() {
      if (!token) return;
      
      try {
        // Load driver state (status, vehicle, location)
        const driverState = await getMyDriverState();
        console.log("📦 Restored driver state:", driverState);
        
        if (driverState.status && driverState.status !== "OFFLINE") {
          setSt(driverState.status);
        }
        if (driverState.vehicleType) {
          setVehicleType(driverState.vehicleType);
        }
        if (driverState.location) {
          const lat = typeof driverState.location.lat === "number" 
            ? driverState.location.lat 
            : parseFloat(driverState.location.lat);
          const lng = typeof driverState.location.lng === "number" 
            ? driverState.location.lng 
            : parseFloat(driverState.location.lng);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            setLat(lat.toFixed(6));
            setLng(lng.toFixed(6));
          }
        }

        // Load current ride (active or offered)
        const rideState = await getCurrentRide();
        console.log("🚗 Restored ride state:", rideState);
        
        if (rideState.type === "active" && rideState.ride) {
          setCurrentRideId(rideState.ride.id);
          setSt("BUSY");
          // Restore ride status from DB
          if (rideState.ride.status === "PICKED_UP") setRideStatus("PICKED_UP");
          else setRideStatus("DRIVER_ASSIGNED");
          // Restore ride info from DB columns
          setCurrentRideInfo({
            bookingId: rideState.ride.booking_id,
            pickup:  rideState.ride.pickup  || null,
            dropoff: rideState.ride.dropoff || null,
            fare:      rideState.ride.fare       != null ? Number(rideState.ride.fare) : null,
            distanceM: rideState.ride.distance_m ?? null,
            durationS: rideState.ride.duration_s ?? null,
            currency:  rideState.ride.currency || "VND",
            userProfile: null, // will be filled below
          });
          // Fetch passenger profile for restored active ride
          if (rideState.ride.user_id) {
            try {
              const pData = await getInternalUserProfile(rideState.ride.user_id);
              if (pData) setCurrentRideInfo(prev => prev ? { ...prev, userProfile: pData } : prev);
            } catch {}
          }
          console.log("✅ Restored active ride:", rideState.ride.id);
        } else if (rideState.type === "offered" && rideState.ride) {
          const ride = rideState.ride;
          const remainingSec = ride.offer_expires_at
            ? Math.max(0, Math.floor((new Date(ride.offer_expires_at).getTime() - Date.now()) / 1000))
            : 30;
          if (remainingSec > 0) {
            console.log("🔔 Restored pending offer:", ride.id, "expires in", remainingSec, "s");
            setRestoredOffer({
              payload: {
                rideId: ride.id,
                bookingId: ride.booking_id,
                expiresInSec: remainingSec,
                pickup: ride.pickup || null,
                dropoff: ride.dropoff || null,
                fare: ride.fare != null ? Number(ride.fare) : null,
                distanceM: ride.distance_m ?? null,
                durationS: ride.duration_s ?? null,
                currency: ride.currency || "VND",
              },
            });
            // Auto-expire timer from remaining time
            if (offerExpireTimerRef.current) clearTimeout(offerExpireTimerRef.current);
            offerExpireTimerRef.current = setTimeout(() => {
              console.log("⏱️ Restored offer expired for ride", ride.id);
              setRestoredOffer(null);
              offerExpireTimerRef.current = null;
            }, (remainingSec + 1) * 1000);
          } else {
            console.log("ℹ️ Pending offer already expired, skipping restore");
          }
        }

        // Load completed ride history
        console.log("📋 Loading driver ride history...");
        const histData = await getDriverRideHistory();
        if (histData.rides?.length) {
          console.log(`✅ Loaded ${histData.rides.length} completed rides`);
          setCompletedRides(
            histData.rides.map((r: any) => ({
              rideId: r.rideId,
              bookingId: r.bookingId,
              completedAt: new Date(r.completedAt).toLocaleString("vi-VN"),
              pickupLabel: r.pickup?.address || (r.pickup ? `${r.pickup.lat}, ${r.pickup.lng}` : ""),
              dropoffLabel: r.dropoff?.address || (r.dropoff ? `${r.dropoff.lat}, ${r.dropoff.lng}` : ""),
              fare: r.fare,
              currency: r.currency || "VND",
            }))
          );
        }
        
      } catch (err) {
        console.error("Failed to load previous state:", err);
      }
    }
    loadPreviousState();
  }, [token]); // Re-run when token changes (login/logout)

  // Load driver profile
  useEffect(() => {
    if (!token) return;
    getProfile().then((res: any) => {
      const p = res.profile || {};
      setProfileFullName(p.full_name || "");
      setProfilePhone(p.phone || "");
      setProfileVehicleType(p.vehicle_type || "CAR_4");
      setProfileLicensePlate(p.license_plate || "");
      setProfileDriverLicense(p.driver_license || "");
    }).catch(() => {});
  }, [token]);

  // When SSE confirms ride_completed or offer cancelled — processed exactly once
  useEffect(() => {
    if (events.length === 0) return;
    const newEvents = events
      .filter((e) => e.ts > lastProcessedEventTsRef.current)
      .sort((a, b) => a.ts - b.ts);
    if (newEvents.length === 0) return;
    lastProcessedEventTsRef.current = newEvents[newEvents.length - 1].ts;

    for (const ev of newEvents) {
      if (ev.eventName === "ride_completed") {
        const completedRideId = ev.data?.payload?.rideId;
        if (completedRideId && completedRideId === currentRideId) {
          console.log("🏁 SSE ride_completed matches current ride — resetting driver state");
          setCurrentRideId(null);
          setCurrentRideInfo(null);
          setRideStatus(null);
          setSt("ONLINE");
        }
      } else if (ev.eventName === "passenger_picked_up") {
        const rideId = ev.data?.payload?.rideId;
        if (rideId && rideId === currentRideId) {
          setRideStatus("PICKED_UP");
        }
      } else if (ev.eventName === "ride_cancelled") {
        const rideId = ev.data?.payload?.rideId;
        if (rideId && rideId === currentRideId) {
          console.log("🚨 Ride cancelled by user:", rideId);
          setCurrentRideId(null);          setCurrentRideInfo(null);          setRideStatus(null);          setSt("ONLINE");
          setRideCancelledMsg("⚠️ Khách hàng đã hủy chuyến. Bạn sẽ nhận chuyến mới.");
          setTimeout(() => setRideCancelledMsg(null), 10000);
        }
      } else if (ev.eventName === "ride_offer_cancelled") {
        const rideId = ev.data?.payload?.rideId;
        if (rideId) {
          console.log("🚫 Offer cancelled for ride", rideId);
          dismissOffer(rideId);
          if (offerExpireTimerRef.current) {
            clearTimeout(offerExpireTimerRef.current);
            offerExpireTimerRef.current = null;
          }
        }
      } else if (ev.eventName === "ride_offer") {
        // Start auto-expire timer based on expiresInSec from offer payload
        const expiresInSec = ev.data?.payload?.expiresInSec;
        const rideId = ev.data?.payload?.rideId || ev.data?.payload?.ride_id;
        if (rideId && expiresInSec) {
          if (offerExpireTimerRef.current) clearTimeout(offerExpireTimerRef.current);
          offerExpireTimerRef.current = setTimeout(() => {
            console.log("⏱️ Offer timed out on frontend for ride", rideId);
            dismissOffer(rideId);
            offerExpireTimerRef.current = null;
          }, (expiresInSec + 1) * 1000); // +1s grace
        }
      }
    }
  }, [events, currentRideId]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastOffer = useMemo(() => {
    // Show only ride_offer events that haven't been accepted/rejected/completed.
    const e = events.find((x) => {
      if (x.eventName !== "ride_offer") return false;
      const payload = x.data?.payload || {};
      const rideId = payload.rideId || payload.ride_id;
      if (!rideId) return false;
      return !dismissedRideIds.has(rideId);
    });
    if (e) return e.data;
    // Fall back to offer restored from API on page load
    if (restoredOffer && !dismissedRideIds.has(restoredOffer.payload.rideId)) {
      return restoredOffer;
    }
    return null;
  }, [events, dismissedRideIds, restoredOffer]);

  const offeredRideId = lastOffer?.payload?.rideId || lastOffer?.payload?.ride_id || null;

  async function useMyLocation() {
    const loc = await getCurrentLocation();
    if (loc) {
      setLat(loc.lat.toFixed(6));
      setLng(loc.lng.toFixed(6));
      // Tự động cập nhật vị trí lên server
      try {
        await updateLocation({ lat: loc.lat, lng: loc.lng, accuracyM: loc.accuracy || 10 });
      } catch (err) {
        console.error("Failed to update location:", err);
      }
    }
  }

  async function doSetStatus(next: "ONLINE" | "OFFLINE") {
    setBusy("status");
    try {
      const resp = await setStatus({ status: next, vehicleType });
      setSt(resp.status || next);
    } finally {
      setBusy(null);
    }
  }

  async function doLocation() {
    setBusy("loc");
    try {
      await updateLocation({ lat: Number(lat), lng: Number(lng), accuracyM: 10 });
      // keep UI simple
    } finally {
      setBusy(null);
    }
  }

  async function doAccept() {
    if (!offeredRideId) return;
    setBusy("accept");
    try {
      await acceptRide(String(offeredRideId));
      // Snapshot the offer details before dismissing
      const offerPayload = lastOffer?.payload;
      setCurrentRideInfo(offerPayload ? {
        bookingId: offerPayload.bookingId || offerPayload.booking_id,
        pickup:    offerPayload.pickup  || null,
        dropoff:   offerPayload.dropoff || null,
        fare:      offerPayload.fare      ?? null,
        distanceM: offerPayload.distanceM ?? null,
        durationS: offerPayload.durationS ?? null,
        currency:  offerPayload.currency  || "VND",
        userProfile: offerPayload.userProfile || null,
      } : null);
      setRideStatus("DRIVER_ASSIGNED");
      dismissOffer(String(offeredRideId));
      setCurrentRideId(String(offeredRideId));
      setSt("BUSY");
    } finally {
      setBusy(null);
    }
  }

  async function doReject() {
    if (!offeredRideId) return;
    setBusy("reject");
    try {
      await rejectRide(String(offeredRideId));
      dismissOffer(String(offeredRideId)); // permanently hide this offer
    } finally {
      setBusy(null);
    }
  }

  async function doPickup() {
    if (!currentRideId) return;
    setBusy("pickup");
    try {
      await pickupPassenger(String(currentRideId));
      setRideStatus("PICKED_UP");
    } catch (e: any) {
      alert(e?.response?.data?.error || e.message || "Lỗi cập nhật trạng thái");
    } finally {
      setBusy(null);
    }
  }

  async function doComplete() {
    if (!currentRideId) return;
    setBusy("complete");
    try {
      await completeRide(String(currentRideId));
      dismissOffer(String(currentRideId));
      setCurrentRideId(null);
      setCurrentRideInfo(null);
      setRideStatus(null);
      setSt("ONLINE");
      // Reload history from server after short delay so DB has committed
      setTimeout(async () => {
        try {
          const histData = await getDriverRideHistory();
          if (histData.rides?.length) {
            setCompletedRides(
              histData.rides.map((r: any) => ({
                rideId: r.rideId,
                bookingId: r.bookingId,
                completedAt: new Date(r.completedAt).toLocaleString("vi-VN"),
                pickupLabel: r.pickup?.address || (r.pickup ? `${r.pickup.lat}, ${r.pickup.lng}` : ""),
                dropoffLabel: r.dropoff?.address || (r.dropoff ? `${r.dropoff.lat}, ${r.dropoff.lng}` : ""),
                fare: r.fare,
                currency: r.currency || "VND",
              }))
            );
          }
        } catch (e) {
          console.error("History reload failed:", e);
        }
      }, 2000);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
        padding: "20px 0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "white", margin: 0, fontSize: 28, fontWeight: 700 }}>🚗 Driver Dashboard</h1>
            <p style={{ color: "rgba(255,255,255,0.9)", margin: "4px 0 0 0", fontSize: 14 }}>
              🚕 Driver: {driverId?.substring(0, 8)}... 
              <span style={{ 
                marginLeft: 12,
                padding: "4px 12px",
                background: status === "ONLINE" ? "rgba(76, 175, 80, 0.3)" : status === "BUSY" ? "rgba(255, 152, 0, 0.3)" : "rgba(244, 67, 54, 0.3)",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600
              }}>
                {status === "ONLINE" ? "🟢 Online" : status === "BUSY" ? "🟡 Busy" : "🔴 Offline"}
              </span>
              <span style={{ 
                marginLeft: 8,
                padding: "4px 10px",
                background: connected ? "rgba(76, 175, 80, 0.3)" : "rgba(255, 255, 255, 0.2)",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600
              }}>
                {connected ? "📡 Connected" : "⚠️ Reconnecting"}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setProfileOpen(true)}
              style={{ padding: "10px 20px", borderRadius: 8, background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            >
              👤 Hồ sơ
            </button>
            <button 
              onClick={logout}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Control Panel Card */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
          }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 22, color: "#333" }}>⚙️ Điều khiển</h2>

            {/* Vehicle Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#555" }}>
                🚗 Loại xe
              </label>
              <select 
                value={vehicleType} 
                onChange={(e) => setVehicleType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "2px solid #e0e0e0",
                  fontSize: 15,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="CAR_4">🚗 Xe 4 chỗ</option>
                <option value="CAR_7">🚐 Xe 7 chỗ</option>
              </select>
            </div>

            {/* Status Control */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#555" }}>
                📊 Trạng thái hoạt động
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button 
                  disabled={busy === "status"} 
                  onClick={() => doSetStatus("ONLINE")}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: status === "ONLINE" ? "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)" : "#f5f5f5",
                    color: status === "ONLINE" ? "white" : "#666",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: busy === "status" ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: status === "ONLINE" ? "0 4px 15px rgba(76, 175, 80, 0.3)" : "none"
                  }}
                >
                  {busy === "status" ? "⏳" : "🟢"} Online
                </button>
                <button 
                  disabled={busy === "status"} 
                  onClick={() => doSetStatus("OFFLINE")}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: status === "OFFLINE" ? "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)" : "#f5f5f5",
                    color: status === "OFFLINE" ? "white" : "#666",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: busy === "status" ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: status === "OFFLINE" ? "0 4px 15px rgba(244, 67, 54, 0.3)" : "none"
                  }}
                >
                  {busy === "status" ? "⏳" : "🔴"} Offline
                </button>
              </div>
            </div>

            {/* Location Control */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontWeight: 600, color: "#555" }}>📍 Vị trí</label>
                <button 
                  onClick={useMyLocation} 
                  disabled={geoLoading}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    background: geoLoading ? "#ccc" : "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                    color: "white",
                    border: "none",
                    cursor: geoLoading ? "wait" : "pointer",
                    fontWeight: 600
                  }}
                >
                  {geoLoading ? "⏳ Đang lấy..." : "📍 GPS"}
                </button>
              </div>
              {geoError && <div style={{ color: "#f44336", fontSize: 12, marginBottom: 8 }}>⚠️ {geoError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input 
                  placeholder="Latitude"
                  value={lat} 
                  onChange={(e) => setLat(e.target.value)} 
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "2px solid #e0e0e0",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
                <input 
                  placeholder="Longitude"
                  value={lng} 
                  onChange={(e) => setLng(e.target.value)} 
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "2px solid #e0e0e0",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
              </div>
              <button 
                disabled={busy === "loc"} 
                onClick={doLocation}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  background: busy === "loc" ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: busy === "loc" ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)"
                }}
              >
                {busy === "loc" ? "⏳ Đang cập nhật..." : "🔄 Cập nhật vị trí"}
              </button>
            </div>

            {/* Incoming Offer */}
            <div style={{
              padding: 16,
              borderRadius: 12,
              background: offeredRideId ? "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)" : "#f5f5f5",
              border: offeredRideId ? "2px solid #ff9800" : "2px solid #e0e0e0",
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: offeredRideId ? "#e65100" : "#666", fontSize: 16 }}>
                {offeredRideId ? "🔔 Chuyến mới!" : "📬 Không có chuyến"}
              </div>
              {offeredRideId ? (
                <>
                  <div style={{ 
                    background: "white", 
                    padding: "10px 12px", 
                    borderRadius: 8,
                    marginBottom: 8,
                    fontSize: 14
                  }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>🆔 Ride:</strong>{" "}
                      <code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                        {String(offeredRideId).substring(0, 12)}...
                      </code>
                    </div>
                    <div>
                      <strong>� Booking:</strong>{" "}
                      <code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                        {(lastOffer?.payload?.bookingId || lastOffer?.payload?.booking_id || "").substring(0, 12)}...
                      </code>
                    </div>
                    {/* Passenger info */}
                    {(lastOffer?.payload?.userProfile?.full_name || lastOffer?.payload?.userProfile?.phone) && (
                      <div style={{ marginTop: 8, background: "#fffde7", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {lastOffer.payload.userProfile?.full_name && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14 }}>👤</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "#e65100" }}>{lastOffer.payload.userProfile.full_name}</span>
                          </div>
                        )}
                        {lastOffer.payload.userProfile?.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14 }}>📞</span>
                            <span style={{ fontWeight: 600, fontSize: 15, color: "#333" }}>{lastOffer.payload.userProfile.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Pickup location */}
                    {lastOffer?.payload?.pickup && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontSize: 16, lineHeight: 1 }}>📍</span>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#222", lineHeight: 1.3 }}>
                              {lastOffer.payload.pickup.address || "Điểm đón"}
                            </div>
                            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                              {Number(lastOffer.payload.pickup.lat).toFixed(6)}, {Number(lastOffer.payload.pickup.lng).toFixed(6)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Dropoff location */}
                    {lastOffer?.payload?.dropoff && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontSize: 16, lineHeight: 1 }}>🏁</span>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#222", lineHeight: 1.3 }}>
                              {lastOffer.payload.dropoff.address || "Điểm đến"}
                            </div>
                            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                              {Number(lastOffer.payload.dropoff.lat).toFixed(6)}, {Number(lastOffer.payload.dropoff.lng).toFixed(6)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Fare and distance */}
                    {(lastOffer?.payload?.fare != null || lastOffer?.payload?.distanceM != null) && (
                      <div style={{
                        marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0",
                        display: "flex", gap: 16
                      }}>
                        {lastOffer?.payload?.fare != null && (
                          <div style={{ flex: 1, textAlign: "center", background: "#fff8e1", borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>💰 Tiền cước</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#e65100" }}>
                              {Number(lastOffer.payload.fare).toLocaleString("vi-VN")} {lastOffer.payload.currency || "VND"}
                            </div>
                          </div>
                        )}
                        {lastOffer?.payload?.distanceM != null && (
                          <div style={{ flex: 1, textAlign: "center", background: "#e8f5e9", borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>📏 Quãng đường</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#2e7d32" }}>
                              {lastOffer.payload.distanceM >= 1000
                                ? `${(lastOffer.payload.distanceM / 1000).toFixed(1)} km`
                                : `${lastOffer.payload.distanceM} m`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button 
                      disabled={busy === "accept"} 
                      onClick={doAccept}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: busy === "accept" ? "#ccc" : "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                        color: "white",
                        border: "none",
                        fontWeight: 600,
                        cursor: busy === "accept" ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 15px rgba(76, 175, 80, 0.3)"
                      }}
                    >
                      {busy === "accept" ? "⏳" : "✅"} Chấp nhận
                    </button>
                    <button 
                      disabled={busy === "reject"} 
                      onClick={doReject}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: busy === "reject" ? "#ccc" : "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                        color: "white",
                        border: "none",
                        fontWeight: 600,
                        cursor: busy === "reject" ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 15px rgba(244, 67, 54, 0.3)"
                      }}
                    >
                      {busy === "reject" ? "⏳" : "❌"} Từ chối
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: "#999", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
                  Đang chờ chuyến mới...
                </div>
              )}
            </div>

            {/* Active Ride */}
            <div style={{
              padding: 16,
              borderRadius: 12,
              background: currentRideId ? "linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)" : "#f5f5f5",
              border: currentRideId ? "2px solid #03a9f4" : "2px solid #e0e0e0"
            }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: currentRideId ? "#01579b" : "#666", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{currentRideId ? "🚗 Đang chạy chuyến" : "⏸️ Không có chuyến"}</span>
                  {rideStatus && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: rideStatus === "PICKED_UP" ? "#e8f5e9" : "#e3f2fd",
                      color: rideStatus === "PICKED_UP" ? "#2e7d32" : "#1565c0",
                      border: `1.5px solid ${rideStatus === "PICKED_UP" ? "#66bb6a" : "#42a5f5"}`
                    }}>
                      {rideStatus === "PICKED_UP" ? "✅ Đã đón khách" : "🕐 Chưa đón khách"}
                    </span>
                  )}
              </div>
              {rideCancelledMsg && (
                <div style={{
                  background: "#fff3e0",
                  border: "1.5px solid #ff9800",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#e65100",
                  fontWeight: 600,
                }}>
                  {rideCancelledMsg}
                </div>
              )}
              {currentRideId ? (
                <>
                  <div style={{ background: "white", padding: "12px 14px", borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
                    {/* Pickup */}
                    {currentRideInfo?.pickup && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #e3f2fd" }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>📍</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a237e", lineHeight: 1.3 }}>
                            {currentRideInfo.pickup.address || `${currentRideInfo.pickup.lat?.toFixed(5)}, ${currentRideInfo.pickup.lng?.toFixed(5)}`}
                          </div>
                          <div style={{ fontSize: 11, color: "#90a4ae", marginTop: 2 }}>
                            {currentRideInfo.pickup.lat?.toFixed(6)}, {currentRideInfo.pickup.lng?.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Dropoff */}
                    {currentRideInfo?.dropoff && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #e3f2fd" }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>🏁</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a237e", lineHeight: 1.3 }}>
                            {currentRideInfo.dropoff.address || `${currentRideInfo.dropoff.lat?.toFixed(5)}, ${currentRideInfo.dropoff.lng?.toFixed(5)}`}
                          </div>
                          <div style={{ fontSize: 11, color: "#90a4ae", marginTop: 2 }}>
                            {currentRideInfo.dropoff.lat?.toFixed(6)}, {currentRideInfo.dropoff.lng?.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Fare + Distance */}
                    {(currentRideInfo?.fare != null || currentRideInfo?.distanceM != null) && (
                      <div style={{ display: "flex", gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #e3f2fd" }}>
                        {currentRideInfo?.fare != null && (
                          <div style={{ flex: 1, textAlign: "center", background: "#fff8e1", borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>💰 Tiền cước</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "#e65100" }}>
                              {Number(currentRideInfo.fare).toLocaleString("vi-VN")} {currentRideInfo.currency || "VND"}
                            </div>
                          </div>
                        )}
                        {currentRideInfo?.distanceM != null && (
                          <div style={{ flex: 1, textAlign: "center", background: "#e8f5e9", borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>📏 Quãng đường</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "#2e7d32" }}>
                              {currentRideInfo.distanceM >= 1000
                                ? `${(currentRideInfo.distanceM / 1000).toFixed(1)} km`
                                : `${currentRideInfo.distanceM} m`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Passenger info */}
                    {(currentRideInfo?.userProfile?.full_name || currentRideInfo?.userProfile?.phone) && (
                      <div style={{ marginBottom: 10, background: "#fffde7", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>👤 Hành khách</div>
                        {currentRideInfo.userProfile?.full_name && (
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#e65100" }}>{currentRideInfo.userProfile.full_name}</div>
                        )}
                        {currentRideInfo.userProfile?.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 14, color: "#333" }}>
                            <span>📞</span> {currentRideInfo.userProfile.phone}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Ride ID */}
                    <div style={{ fontSize: 12, color: "#90a4ae" }}>
                      🆔 <code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>{currentRideId.substring(0, 16)}...</code>
                    </div>
                  </div>
                  {/* Đã đón khách button — only shown when status is DRIVER_ASSIGNED */}
                  {rideStatus === "DRIVER_ASSIGNED" && (
                    <button
                      disabled={busy === "pickup"}
                      onClick={doPickup}
                      style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 10,
                        marginBottom: 10,
                        background: busy === "pickup" ? "#ccc" : "linear-gradient(135deg, #43a047 0%, #66bb6a 100%)",
                        color: "white",
                        border: "none",
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: busy === "pickup" ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 15px rgba(67, 160, 71, 0.35)"
                      }}
                    >
                      {busy === "pickup" ? "⏳ Đang cập nhật..." : "🙋 Đã đón khách"}
                    </button>
                  )}
                  <button 
                    disabled={busy === "complete"} 
                    onClick={doComplete}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 10,
                      background: busy === "complete" ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: busy === "complete" ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)"
                    }}
                  >
                    {busy === "complete" ? "⏳ Đang hoàn tất..." : "✅ Hoàn tất chuyến"}
                  </button>
                </>
              ) : (
                <div style={{ color: "#999", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
                  Chưa có chuyến nào đang thực hiện
                </div>
              )}
            </div>
          </div>

          {/* Timeline Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Completed Rides History */}
            {completedRides.length > 0 && (
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: 20, color: "#333" }}>📋 Chuyến đã thực hiện</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
                  {completedRides.map((r, i) => (
                    <div key={r.rideId + i} style={{
                      background: i === 0
                        ? "linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)"
                        : "#f9f9f9",
                      border: i === 0 ? "1.5px solid #81c784" : "1.5px solid #e0e0e0",
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 13
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: i === 0 ? "#2e7d32" : "#555" }}>
                          {i === 0 ? "✅ Vừa hoàn thành" : `🕐 ${r.completedAt}`}
                        </span>
                        {r.fare && (
                          <span style={{ fontWeight: 700, color: "#00838f" }}>
                            💰 {r.fare.toLocaleString()} {r.currency}
                          </span>
                        )}
                      </div>
                      {r.pickupLabel && (
                        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                          <span style={{ color: "#4CAF50", flexShrink: 0 }}>📍</span>
                          <span style={{ color: "#444", wordBreak: "break-all" }}>{r.pickupLabel}</span>
                        </div>
                      )}
                      {r.dropoffLabel && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{ color: "#f44336", flexShrink: 0 }}>🏁</span>
                          <span style={{ color: "#444", wordBreak: "break-all" }}>{r.dropoffLabel}</span>
                        </div>
                      )}
                      {!r.pickupLabel && !r.dropoffLabel && (
                        <div style={{ color: "#888" }}>Ride: <code style={{ background: "#f0f0f0", padding: "1px 6px", borderRadius: 4 }}>{r.rideId.substring(0, 12)}...</code></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Timeline */}
            <div style={{
              background: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              maxHeight: "calc(100vh - 200px)",
              overflow: "auto"
            }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: 16
            }}>
              <h2 style={{ margin: 0, fontSize: 22, color: "#333" }}>📊 Sự kiện</h2>
              <button 
                onClick={clear}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                🗑️ Xóa
              </button>
            </div>
            <Timeline events={events} />
            </div>

          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setProfileOpen(false)}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#333" }}>👤 Hồ sơ tài xế</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#555" }}>Họ và tên</label>
                <input type="text" value={profileFullName} onChange={e => setProfileFullName(e.target.value)} placeholder="Nguyễn Văn A"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#555" }}>Số điện thoại</label>
                <input type="tel" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="09xxxxxxxx"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ background: "#f8f4ff", borderRadius: 10, padding: "14px 16px" }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#6b21a8" }}>Loại xe</label>
                <select value={profileVehicleType} onChange={e => setProfileVehicleType(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #d8b4fe", fontSize: 14, outline: "none", background: "white", cursor: "pointer" }}>
                  <option value="CAR_4">🚗 Xe 4 chỗ</option>
                  <option value="CAR_7">🚐 Xe 7 chỗ</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#555" }}>Biển số xe</label>
                <input type="text" value={profileLicensePlate} onChange={e => setProfileLicensePlate(e.target.value)} placeholder="51A-123.45"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#555" }}>Số GPLX</label>
                <input type="text" value={profileDriverLicense} onChange={e => setProfileDriverLicense(e.target.value)} placeholder="012345678901"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            {profileSaved && <div style={{ marginTop: 12, color: "#2e7d32", fontWeight: 600, fontSize: 14 }}>✅ Đã lưu thành công!</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setProfileOpen(false)}
                style={{ flex: 1, padding: 12, borderRadius: 8, background: "#f5f5f5", border: "none", fontWeight: 600, cursor: "pointer" }}>Đóng</button>
              <button disabled={profileSaving}
                onClick={async () => {
                  setProfileSaving(true); setProfileSaved(false);
                  try {
                    await updateProfile({ fullName: profileFullName, phone: profilePhone, vehicleType: profileVehicleType, licensePlate: profileLicensePlate, driverLicense: profileDriverLicense });
                    setProfileSaved(true);
                    setTimeout(() => setProfileSaved(false), 3000);
                  } catch {}
                  setProfileSaving(false);
                }}
                style={{ flex: 2, padding: 12, borderRadius: 8, background: profileSaving ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", fontWeight: 600, cursor: profileSaving ? "not-allowed" : "pointer" }}>
                {profileSaving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}