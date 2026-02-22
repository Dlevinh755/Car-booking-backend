import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useSSE } from "../../sse/useSSE";
import { Timeline } from "../../components/Timeline";
import { PlaceSearchInput } from "../../components/PlaceSearchInput";
import { estimate } from "../../api/pricing";
import { createBooking, getMyActiveBooking, getUserBookingHistory, cancelBooking } from "../../api/booking";
import { getCurrentRideForUser, cancelRide } from "../../api/ride";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { geoReverse } from "../../api/geo";
import { getProfile, updateProfile, getInternalDriverProfile } from "../../api/auth";
import { createVnpayUrl } from "../../api/payment";

export function UserDashboard() {
  const { token, logout, userId } = useAuth();
  const { connected, events, clear } = useSSE(token, true);
  const { loading: geoLoading, error: geoError, getCurrentLocation } = useCurrentLocation();

  const [vehicleType, setVehicleType] = useState("CAR_4");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "VNPAY">("CASH");
  const [pickup, setPickup] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ label: string; lat: number; lng: number } | null>(null);

  const [est, setEst] = useState<any>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingCreatedAt, setBookingCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [restoredRide, setRestoredRide] = useState<any>(null);
  // Dedicated accepted ride state — explicitly cleared, not derived from accumulated events
  const [acceptedRide, setAcceptedRide] = useState<{
    rideId: string; driverId: string; bookingId: string;
  } | null>(null);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [completedRides, setCompletedRides] = useState<Array<{
    rideId: string;
    driverId: string;
    bookingId: string;
    completedAt: string;
    pickupLabel?: string;
    dropoffLabel?: string;
    fare?: number;
    currency?: string;
  }>>([]); 

  // Countdown timer: 120s before auto-cancel kicks in
  const CANCEL_TIMEOUT_SEC = 120;
  const [countdown, setCountdown] = useState<number>(CANCEL_TIMEOUT_SEC);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelledMsg, setCancelledMsg] = useState<string | null>(null);
  const [rideCancelLoading, setRideCancelLoading] = useState(false);
  // Track ride sub-status: null=unknown, DRIVER_ASSIGNED=heading to pickup, PICKED_UP=on board
  const [rideStatus, setRideStatus] = useState<"DRIVER_ASSIGNED" | "PICKED_UP" | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Profile modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  // Driver profile shown during active ride
  const [driverProfile, setDriverProfile] = useState<{
    full_name?: string | null;
    phone?: string | null;
    vehicle_type?: string | null;
    license_plate?: string | null;
  } | null>(null);
  // Prevent re-processing stale SSE events (e.g. hello on reconnect re-triggers booking_cancelled)
  const lastProcessedEventTsRef = useRef<number>(0);
  // Payment confirmation banner
  const [paymentBanner, setPaymentBanner] = useState<{ status: "SUCCESS" | "FAILED"; orderId: string } | null>(null);

  const bias = useMemo(() => pickup ? { lat: pickup.lat, lng: pickup.lng } : null, [pickup]);

  // activeRide: priority SSE accepted > restored from API
  const activeRide = acceptedRide ?? (restoredRide ? {
    rideId: restoredRide.id,
    driverId: restoredRide.driver_id,
    bookingId: restoredRide.booking_id,
  } : null);

  // Auto-restore user booking and ride state on mount
  useEffect(() => {
    async function loadPreviousState() {
      if (!token) return;
      
      try {
        // Load active booking
        console.log("📦 Loading user booking state...");
        const bookingData = await getMyActiveBooking();
        
        if (bookingData.booking) {
          console.log("✅ Restored booking:", bookingData.booking.id);
          setBookingId(bookingData.booking.id);
          setBookingCreatedAt(bookingData.booking.createdAt || null);
          
          // Restore pickup/dropoff
          setPickup({
            lat: bookingData.booking.pickup.lat,
            lng: bookingData.booking.pickup.lng,
            label: bookingData.booking.pickup.address || 
                   `${bookingData.booking.pickup.lat}, ${bookingData.booking.pickup.lng}`,
          });
          
          setDropoff({
            lat: bookingData.booking.dropoff.lat,
            lng: bookingData.booking.dropoff.lng,
            label: bookingData.booking.dropoff.address || 
                   `${bookingData.booking.dropoff.lat}, ${bookingData.booking.dropoff.lng}`,
          });
          
          setVehicleType(bookingData.booking.vehicleType);
          
          // Restore pricing estimate
          if (bookingData.booking.fare) {
            setEst({
              fare: bookingData.booking.fare,
              currency: bookingData.booking.currency,
              distanceM: bookingData.booking.distanceM,
              durationS: bookingData.booking.durationS,
            });
          }
        } else {
          console.log("ℹ️ No active booking found");
        }

        // Load active ride (if driver already accepted)
        console.log("🚗 Loading user ride state...");
        const rideData = await getCurrentRideForUser();
        
        if (rideData.ride) {
          console.log("✅ Restored ride:", rideData.type, rideData.ride.id);
          setRestoredRide(rideData.ride);
          // Restore pickup sub-status
          if (rideData.ride.status === "PICKED_UP") setRideStatus("PICKED_UP");
          else if (rideData.ride.status === "DRIVER_ASSIGNED") setRideStatus("DRIVER_ASSIGNED");
          // Fetch driver profile
          if (rideData.ride.driver_id) {
            getInternalDriverProfile(rideData.ride.driver_id).then(p => { if (p) setDriverProfile(p); }).catch(() => {});
          }
        } else {
          console.log("ℹ️ No active ride found");
          setRestoredRide(null);
        }

        // Load completed ride history
        console.log("📋 Loading ride history...");
        const histData = await getUserBookingHistory();
        if (histData.rides?.length) {
          console.log(`✅ Loaded ${histData.rides.length} completed rides`);
          setCompletedRides(
            histData.rides.map((r: any) => ({
              rideId: r.rideId,
              driverId: r.driverId || "",
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
        console.error("❌ Failed to load user state:", err);
      }
    }
    
    loadPreviousState();
  }, [token]);

  // Load profile when token is available
  useEffect(() => {
    if (!token) return;
    getProfile().then(({ profile }) => {
      if (profile) {
        setProfileFullName(profile.full_name || "");
        setProfilePhone(profile.phone || "");
      }
    }).catch(() => {});
  }, [token]);

  // Handle all real-time SSE events — processed exactly once using lastProcessedEventTsRef
  // to prevent stale events from re-firing on reconnect (e.g. booking_cancelled on hello)
  useEffect(() => {
    if (events.length === 0) return;
    const newEvents = events
      .filter((e) => e.ts > lastProcessedEventTsRef.current)
      .sort((a, b) => a.ts - b.ts); // process oldest first
    if (newEvents.length === 0) return;
    lastProcessedEventTsRef.current = newEvents[newEvents.length - 1].ts;

    for (const ev of newEvents) {
      if (ev.eventName === "ride_accepted") {
        const { rideId, driverId, bookingId: bkId, driverProfile: dp } = ev.data?.payload ?? {};
        if (rideId) {
          setAcceptedRide({ rideId, driverId, bookingId: bkId });
          setRestoredRide(null);
          setRideStatus("DRIVER_ASSIGNED");
          if (dp) setDriverProfile(dp);
          else if (driverId) {
            getInternalDriverProfile(driverId).then(p => { if (p) setDriverProfile(p); }).catch(() => {});
          }
        }
      } else if (ev.eventName === "passenger_picked_up") {
        setRideStatus("PICKED_UP");
      } else if (ev.eventName === "ride_completed") {
        console.log("🏁 Ride completed, resetting user state");
        const snap = ev.data?.payload;
        const rideId   = snap?.rideId   || restoredRide?.id        || acceptedRide?.rideId  || "";
        const driverId = snap?.driverId || restoredRide?.driver_id || acceptedRide?.driverId || "";
        const bkId     = snap?.bookingId || restoredRide?.booking_id || acceptedRide?.bookingId || bookingId || "";
        if (rideId) {
          setCompletedRides((prev) => [
            {
              rideId,
              driverId,
              bookingId: bkId,
              completedAt: new Date().toLocaleString("vi-VN"),
              pickupLabel: pickup?.label,
              dropoffLabel: dropoff?.label,
              fare: est?.fare,
              currency: est?.currency || "VND",
            },
            ...prev.filter((r) => r.rideId !== rideId),
          ]);
        }
        setAcceptedRide(null);
        setRestoredRide(null);
        setBookingId(null);
        setBookingCreatedAt(null);
        setPickup(null);
        setDropoff(null);
        setEst(null);
        setRideStatus(null);
        setDriverProfile(null);
        setRideCompleted(true);
        setTimeout(() => setRideCompleted(false), 20000);
        setTimeout(async () => {
          try {
            const histData = await getUserBookingHistory();
            if (histData.rides?.length) {
              setCompletedRides(
                histData.rides.map((r: any) => ({
                  rideId: r.rideId,
                  driverId: r.driverId || "",
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
            console.warn("Failed to reload history after completion:", e);
          }
        }, 3000);
      } else if (ev.eventName === "booking_cancelled") {
        const reason = ev.data?.payload?.reason;
        const msg = reason === "no_driver_timeout"
          ? "Không tìm được tài xế sau 2 phút. Booking đã bị hủy tự động."
          : "Booking đã được hủy thành công.";
        setCancelledMsg(msg);
        setAcceptedRide(null);
        setRestoredRide(null);
        setBookingId(null);
        setBookingCreatedAt(null);
        setRideStatus(null);
        setDriverProfile(null);
        setTimeout(() => setCancelledMsg(null), 10000);
      } else if (ev.eventName === "ride_cancelled") {
        // Ride cancelled by user (echo back) — clear state
        setAcceptedRide(null);
        setRestoredRide(null);
        setBookingId(null);
        setBookingCreatedAt(null);
        setRideStatus(null);
        setDriverProfile(null);
      } else if (ev.eventName === "payment") {
        const { status, orderId } = ev.data?.payload ?? {};
        if (status) {
          setPaymentBanner({ status: status as "SUCCESS" | "FAILED", orderId: orderId ?? "" });
          setTimeout(() => setPaymentBanner(null), 15000);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  async function useMyLocation() {
    const loc = await getCurrentLocation();
    if (!loc) return;
    // Show coordinates immediately so user sees something right away
    const coordLabel = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
    setPickup({ label: `📍 ${coordLabel}`, lat: loc.lat, lng: loc.lng });
    // Then try to resolve a human-readable address
    const address = await geoReverse(loc.lat, loc.lng);
    if (address) {
      setPickup({ label: address, lat: loc.lat, lng: loc.lng });
    }
  }

  async function doRideCancel() {
    if (!activeRide?.rideId || rideCancelLoading) return;
    setRideCancelLoading(true);
    try {
      await cancelRide(activeRide.rideId);
      // Optimistically clear ride state
      setCancelledMsg("✅ Đã hủy chuyến thành công.");
      setAcceptedRide(null);
      setRestoredRide(null);
      setBookingId(null);
      setBookingCreatedAt(null);
      setRideStatus(null);
      setDriverProfile(null);
      setTimeout(() => setCancelledMsg(null), 6000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || "Hủy chuyến thất bại";
      setCancelledMsg(`❌ ${msg}`);
      setTimeout(() => setCancelledMsg(null), 5000);
    } finally {
      setRideCancelLoading(false);
    }
  }

  // Countdown timer: start when searching for driver, stop when matched/cancelled
  useEffect(() => {
    const isSearching = !!bookingId && !activeRide;
    if (!isSearching) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(CANCEL_TIMEOUT_SEC);
      return;
    }

    // Calculate real remaining time based on when booking was created
    const elapsed = bookingCreatedAt
      ? Math.floor((Date.now() - new Date(bookingCreatedAt).getTime()) / 1000)
      : 0;
    const remaining = Math.max(CANCEL_TIMEOUT_SEC - elapsed, 0);

    if (remaining === 0) {
      setCountdown(0);
      // Already expired on restore — clear state immediately, show message only if cancel succeeds
      // (if it fails, the booking was already cancelled by backend; SSE will show the message)
      const expiredId = bookingId!;
      setAcceptedRide(null);
      setRestoredRide(null);
      setBookingId(null);
      setBookingCreatedAt(null);
      cancelBooking(expiredId)
        .then(() => {
          setCancelledMsg("Không tìm được tài xế. Booking đã bị hủy tự động.");
          setTimeout(() => setCancelledMsg(null), 10000);
        })
        .catch(() => {
          // Backend already cancelled — SSE booking_cancelled will handle the message
        });
      return;
    }

    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [bookingId, bookingCreatedAt, activeRide]); // eslint-disable-line react-hooks/exhaustive-deps

  // When countdown reaches 0 while still searching, auto-cancel
  useEffect(() => {
    if (countdown === 0 && bookingId && !activeRide) {
      const expiredId = bookingId;
      setAcceptedRide(null);
      setRestoredRide(null);
      setBookingId(null);
      setBookingCreatedAt(null);
      cancelBooking(expiredId)
        .then(() => {
          setCancelledMsg("Không tìm được tài xế. Booking đã bị hủy tự động.");
          setTimeout(() => setCancelledMsg(null), 10000);
        })
        .catch(() => {
          // Already cancelled by backend — SSE booking_cancelled will handle the message
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  async function doCancel() {
    if (!bookingId || cancelLoading) return;
    setCancelLoading(true);
    try {
      await cancelBooking(bookingId);
      // Clear state optimistically (SSE will also arrive and clear again — idempotent)
      setCancelledMsg("Booking đã được hủy thành công.");
      setAcceptedRide(null);
      setRestoredRide(null);
      setBookingId(null);
      setBookingCreatedAt(null);
      setTimeout(() => setCancelledMsg(null), 10000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || "Hủy booking thất bại";
      setCancelledMsg(`❌ ${msg}`);
      setTimeout(() => setCancelledMsg(null), 5000);
    } finally {
      setCancelLoading(false);
    }
  }

  async function doEstimate() {
    if (!pickup || !dropoff) return;
    setLoading("estimate");
    try {
      const resp = await estimate({ pickup, dropoff, vehicleType });
      setEst(resp);
    } finally {
      setLoading(null);
    }
  }

  async function doBook() {
    if (!pickup || !dropoff) return;
    setLoading("book");
    try {
      // Always fetch a fresh estimate at booking time to prevent price discrepancy
      const freshEstimate = await estimate({ pickup, dropoff, vehicleType });
      setEst(freshEstimate);

      if (!freshEstimate?.fare || !freshEstimate?.distanceM || !freshEstimate?.durationS) {
        throw new Error("Không thể tính giá. Vui lòng thử lại.");
      }

      const resp = await createBooking({
        userId,
        pickup,
        dropoff,
        vehicleType,
        paymentMethod,
        pricingSnapshot: {
          fare: freshEstimate.fare,
          distanceM: freshEstimate.distanceM,
          durationS: freshEstimate.durationS,
        }
      });
      const newBookingId = resp.bookingId || resp.id || null;
      setBookingId(newBookingId);
      setBookingCreatedAt(new Date().toISOString());

      // If VNPay, open payment page in a new tab
      if (paymentMethod === "VNPAY" && newBookingId && freshEstimate.fare) {
        try {
          const vnpay = await createVnpayUrl({
            orderId: newBookingId,
            amount: Math.round(freshEstimate.fare),
            userId: userId ?? undefined,
          });
          window.open(vnpay.paymentUrl, "_blank", "noopener,noreferrer");
        } catch (vnpErr: any) {
          console.error("VNPay URL error:", vnpErr);
          alert("⚠️ Đặt xe thành công nhưng không mở được trang VNPay. Bạn có thể thanh toán sau.");
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || "Tạo booking thất bại");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px 0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "white", margin: 0, fontSize: 28, fontWeight: 700 }}>🚖 Taxi Booking</h1>
            <p style={{ color: "rgba(255,255,255,0.9)", margin: "4px 0 0 0", fontSize: 14 }}>
              👤 User: {userId?.substring(0, 8)}... 
              <span style={{ 
                marginLeft: 12,
                padding: "4px 10px",
                background: connected ? "rgba(76, 175, 80, 0.3)" : "rgba(255, 255, 255, 0.2)",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600
              }}>
                {connected ? "🟢 Online" : "🔴 Offline"}
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
              style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            >
              🛊Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
       <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Booking Form Card */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
          }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 22, color: "#333" }}>📍 Đặt chuyến xe</h2>

            {/* Vehicle Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#555" }}>
                🚗 Loại xe
              </label>
              <select 
                value={vehicleType} 
                onChange={(e) => { setVehicleType(e.target.value); setEst(null); }}
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

            {/* Pickup Location */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontWeight: 600, color: "#555" }}>📍 Điểm đón</label>
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
                  {geoLoading ? "⏳ Đang lấy..." : "📍 Vị trí hiện tại"}
                </button>
              </div>
              <PlaceSearchInput label="" value={pickup} onChange={(v) => { setPickup(v); setEst(null); }} biasLatLng={null} />
              {geoError && <div style={{ color: "#f44336", fontSize: 12, marginTop: 4 }}>⚠️ {geoError}</div>}
            </div>

            {/* Dropoff Location */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#555" }}>
                🎯 Điểm đến
              </label>
              <PlaceSearchInput label="" value={dropoff} onChange={(v) => { setDropoff(v); setEst(null); }} biasLatLng={bias} />
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#555" }}>
                💳 Phương thức thanh toán
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: paymentMethod === "CASH" ? "2px solid #4CAF50" : "2px solid #e0e0e0",
                    background: paymentMethod === "CASH" ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)" : "white",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    color: paymentMethod === "CASH" ? "#2e7d32" : "#666",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: paymentMethod === "CASH" ? "0 2px 8px rgba(76,175,80,0.3)" : "none",
                  }}
                >
                  💵 Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("VNPAY")}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: paymentMethod === "VNPAY" ? "2px solid #1565c0" : "2px solid #e0e0e0",
                    background: paymentMethod === "VNPAY" ? "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)" : "white",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    color: paymentMethod === "VNPAY" ? "#1565c0" : "#666",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: paymentMethod === "VNPAY" ? "0 2px 8px rgba(21,101,192,0.3)" : "none",
                  }}
                >
                  📳 VNPay
                </button>
              </div>
              {paymentMethod === "VNPAY" && (
                <div style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  background: "#e3f2fd",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#1565c0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  ℹ️ Trang thanh toán VNPay sẽ mở trong tab mới khi bạn đặt xe.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button 
                disabled={loading === "estimate" || !pickup || !dropoff} 
                onClick={doEstimate}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: loading === "estimate" ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: (loading === "estimate" || !pickup || !dropoff) ? "not-allowed" : "pointer",
                  opacity: (loading === "estimate" || !pickup || !dropoff) ? 0.6 : 1,
                  transition: "all 0.2s",
                  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)"
                }}
              >
                {loading === "estimate" ? "⏳ Đang tính..." : "� Ước tính giá"}
              </button>
              <button 
                disabled={loading === "book" || !pickup || !dropoff} 
                onClick={doBook}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: loading === "book" ? "#ccc" : paymentMethod === "VNPAY"
                    ? "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)"
                    : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "white",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: (loading === "book" || !pickup || !dropoff) ? "not-allowed" : "pointer",
                  opacity: (loading === "book" || !pickup || !dropoff) ? 0.6 : 1,
                  transition: "all 0.2s",
                  boxShadow: paymentMethod === "VNPAY"
                    ? "0 4px 15px rgba(21,101,192,0.4)"
                    : "0 4px 15px rgba(245, 87, 108, 0.3)"
                }}
              >
                {loading === "book" ? "⏳ Đang đặt..." : paymentMethod === "VNPAY" ? "📳 Đặt & Thanh toán VNPay" : "🚀 Đặt xe ngay"}
              </button>
            </div>

            {/* Estimate Result */}
            {est && (
              <div style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
                padding: 16,
                borderRadius: 12,
                border: "2px solid #00acc1"
              }}>
                <div style={{ fontWeight: 700, marginBottom: 12, color: "#00838f", fontSize: 16 }}>
                  💎 Ước tính giá cước
                </div>
                <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
                  <div style={{ 
                    padding: "10px 14px", 
                    background: "white", 
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <span style={{ fontWeight: 500 }}>💰 Giá:</span>
                    <span style={{ fontWeight: 700, color: "#00838f" }}>
                      {est.fare?.toLocaleString()} {est.currency || "VND"}
                    </span>
                  </div>
                  <div style={{ 
                    padding: "10px 14px", 
                    background: "white", 
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <span style={{ fontWeight: 500 }}>📏 Khoảng cách:</span>
                    <span style={{ fontWeight: 600 }}>{(est.distanceM / 1000).toFixed(2)} km</span>
                  </div>
                  <div style={{ 
                    padding: "10px 14px", 
                    background: "white", 
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <span style={{ fontWeight: 500 }}>⏱️ Thời gian:</span>
                    <span style={{ fontWeight: 600 }}>{Math.round(est.durationS / 60)} phút</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation message */}
            {cancelledMsg && (
              <div style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                padding: 16,
                borderRadius: 12,
                border: "2px solid #FF9800",
                textAlign: "center",
                fontWeight: 600,
                color: "#E65100"
              }}>
                🚫 {cancelledMsg}
              </div>
            )}

            {/* Payment confirmation banner */}
            {paymentBanner && (
              <div style={{
                marginTop: 20,
                background: paymentBanner.status === "SUCCESS"
                  ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
                  : "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
                padding: 16,
                borderRadius: 12,
                border: `2px solid ${paymentBanner.status === "SUCCESS" ? "#4CAF50" : "#f44336"}`,
                textAlign: "center",
                fontWeight: 600,
                color: paymentBanner.status === "SUCCESS" ? "#2e7d32" : "#b71c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}>
                {paymentBanner.status === "SUCCESS" ? "✅" : "❌"}
                {paymentBanner.status === "SUCCESS"
                  ? `Thanh toán VNPay thành công! Mã đơn: ${paymentBanner.orderId}`
                  : `Thanh toán VNPay thất bại. Mã đơn: ${paymentBanner.orderId}`}
                <button
                  onClick={() => setPaymentBanner(null)}
                  style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                  title="Đóng"
                >×</button>
              </div>
            )}

            {/* Booking Success + countdown */}
            {bookingId && !activeRide && (
              <div style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                padding: 16,
                borderRadius: 12,
                border: "2px solid #4CAF50"
              }}>
                <div style={{ fontWeight: 700, color: "#2e7d32", marginBottom: 8, fontSize: 16 }}>
                  ✅ Đặt xe thành công!
                </div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong>Mã booking:</strong>{" "}
                  <code style={{
                    background: "white",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#2e7d32"
                  }}>
                    {bookingId}
                  </code>
                </div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
                  🔍 Đang tìm tài xế gần bạn...
                </div>

                {/* Countdown + Cancel */}
                <div style={{
                  background: "white",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: countdown <= 30 ? "1.5px solid #FF9800" : "1.5px solid #e0e0e0"
                }}>
                  <div style={{ fontSize: 13, color: countdown <= 30 ? "#E65100" : "#666" }}>
                    ⏱️ Tự động hủy sau:{" "}
                    <strong style={{ fontSize: 15, fontFamily: "monospace" }}>
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                    </strong>
                  </div>
                  <button
                    onClick={doCancel}
                    disabled={cancelLoading}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      background: cancelLoading ? "#ccc" : "linear-gradient(135deg, #ef5350 0%, #c62828 100%)",
                      color: "white",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: cancelLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(239,83,80,0.3)"
                    }}
                  >
                    {cancelLoading ? "⏳ Đang hủy..." : "❌ Hủy chuyến"}
                  </button>
                </div>
              </div>
            )}

            {/* Ride Completed Banner - auto-hides after 20s */}
            {rideCompleted && (
              <div style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 100%)",
                padding: 20,
                borderRadius: 12,
                border: "2px solid #4CAF50",
                boxShadow: "0 4px 20px rgba(76, 175, 80, 0.3)",
                textAlign: "center",
                animation: "fadeIn 0.5s ease"
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#2e7d32", fontSize: 20, marginBottom: 6 }}>
                  Chuyến đi đã hoàn thành!
                </div>
                <div style={{ color: "#388e3c", fontSize: 14, marginBottom: 4 }}>
                  Cảm ơn bạn đã tin dùng dịch vụ. Chuyến đi đã được ghi lại vào lịch sử. 🌟
                </div>
                <div style={{ color: "#81c784", fontSize: 12 }}>
                  Thông báo sẽ tự ẩn sau 20 giây
                </div>
              </div>
            )}

            {/* Active Ride - Driver Accepted */}
            {activeRide && !rideCompleted && (
              <div style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)",
                padding: 20,
                borderRadius: 12,
                border: "2px solid #FFA726",
                boxShadow: "0 4px 20px rgba(255, 167, 38, 0.3)"
              }}>
                <div style={{ 
                  fontWeight: 700, 
                  color: "#F57C00", 
                  marginBottom: 16, 
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  {rideStatus === "PICKED_UP" ? "🚙 Khách đã lên xe!" : "🚕 Tài xế đã nhận chuyến!"}
                </div>

                <div style={{ background: "white", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
                    {/* Pickup */}
                    {pickup && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingBottom: 12, borderBottom: "1px solid #fff3e0" }}>
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>📍</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#333", lineHeight: 1.3 }}>{pickup.label}</div>
                          <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{pickup.lat.toFixed(6)}, {pickup.lng.toFixed(6)}</div>
                        </div>
                      </div>
                    )}
                    {/* Dropoff */}
                    {dropoff && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingBottom: 12, borderBottom: "1px solid #fff3e0" }}>
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🏁</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#333", lineHeight: 1.3 }}>{dropoff.label}</div>
                          <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{dropoff.lat.toFixed(6)}, {dropoff.lng.toFixed(6)}</div>
                        </div>
                      </div>
                    )}
                    {/* Fare + Distance */}
                    {(est?.fare != null || est?.distanceM != null) && (
                      <div style={{ display: "flex", gap: 10, paddingBottom: 12, borderBottom: "1px solid #fff3e0" }}>
                        {est?.fare != null && (
                          <div style={{ flex: 1, textAlign: "center", background: "#fff8e1", borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>💰 Tiền cước</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "#e65100" }}>
                              {Number(est.fare).toLocaleString("vi-VN")} {est.currency || "VND"}
                            </div>
                          </div>
                        )}
                        {est?.distanceM != null && (
                          <div style={{ flex: 1, textAlign: "center", background: "#e8f5e9", borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>📏 Quãng đường</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "#2e7d32" }}>
                              {est.distanceM >= 1000
                                ? `${(est.distanceM / 1000).toFixed(1)} km`
                                : `${est.distanceM} m`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Driver info */}
                    {(driverProfile?.full_name || driverProfile?.phone || driverProfile?.license_plate) ? (
                      <div style={{ background: "#f3e5f5", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 11, color: "#7b1fa2", fontWeight: 700, marginBottom: 2 }}>🚗 THÔNG TIN TÀI XẾ</div>
                        {driverProfile?.full_name && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span>👤</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "#4a148c" }}>{driverProfile.full_name}</span>
                          </div>
                        )}
                        {driverProfile?.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span>📞</span>
                            <span style={{ fontWeight: 600, fontSize: 15, color: "#333" }}>{driverProfile.phone}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                          {driverProfile?.vehicle_type && (
                            <span style={{ background: "#ce93d8", color: "white", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
                              {driverProfile.vehicle_type === "CAR_7" ? "🚐 7 chỗ" : "🚗 4 chỗ"}
                            </span>
                          )}
                          {driverProfile?.license_plate && (
                            <span style={{ background: "#ede7f6", color: "#4a148c", border: "1px solid #ce93d8", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                              🔢 {driverProfile.license_plate}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 500, color: "#666" }}>👤 Tài xế:</span>
                        <code style={{ background: "#f5f5f5", padding: "4px 10px", borderRadius: 6, fontWeight: 600, fontSize: 13 }}>
                          {activeRide.driverId.substring(0, 8)}...
                        </code>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 500, color: "#666" }}>🔑 Chuyến đi:</span>
                      <code style={{ background: "#f5f5f5", padding: "4px 10px", borderRadius: 6, fontWeight: 600, fontSize: 13 }}>
                        {activeRide.rideId.substring(0, 8)}...
                      </code>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: rideStatus === "PICKED_UP" ? "rgba(46,125,50,0.10)" : "rgba(255, 167, 38, 0.1)",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  color: rideStatus === "PICKED_UP" ? "#2e7d32" : "#E65100",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  <span>{rideStatus === "PICKED_UP" ? "🌟" : "🚦"}</span>
                  <span style={{ fontWeight: 600 }}>
                    {rideStatus === "PICKED_UP"
                      ? "Tài xế đã đón bạn, đang trên đường đến điểm được thả khách..."
                      : "Tài xế đang trên đường đến đón bạn..."}
                  </span>
                </div>

                <button
                  onClick={doRideCancel}
                  disabled={rideCancelLoading}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 8,
                    background: rideCancelLoading ? "#ccc" : "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                    color: "white",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: rideCancelLoading ? "not-allowed" : "pointer",
                    boxShadow: rideCancelLoading ? "none" : "0 4px 12px rgba(244,67,54,0.3)"
                  }}
                >
                  {rideCancelLoading ? "⏳ Đang hủy..." : "❌ Hủy chuyến"}
                </button>
              </div>
            )}
          </div>

          {/* Ride History + Timeline Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Completed Rides History */}
            {completedRides.length > 0 && (
              <div style={{
                background: "white",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: 20, color: "#333" }}>📋 Chuyến xe đã đi</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {completedRides.map((r, i) => (
                    <div key={r.rideId} style={{
                      background: i === 0
                        ? "linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)"
                        : "#f9f9f9",
                      border: i === 0 ? "1.5px solid #81c784" : "1.5px solid #e0e0e0",
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 13
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: i === 0 ? "#2e7d32" : "#555" }}>
                          {i === 0 ? "✅ Vừa hoàn thành" : `🕐 ${r.completedAt}`}
                        </span>
                        {i === 0 && (
                          <span style={{ color: "#81c784", fontSize: 12 }}>{r.completedAt}</span>
                        )}
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {r.pickupLabel && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: "#4CAF50", flexShrink: 0 }}>📍</span>
                            <span style={{ color: "#444", wordBreak: "break-all" }}>{r.pickupLabel}</span>
                          </div>
                        )}
                        {r.dropoffLabel && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: "#f44336", flexShrink: 0 }}>🏁</span>
                            <span style={{ color: "#444", wordBreak: "break-all" }}>{r.dropoffLabel}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          {r.driverId ? (
                            <span style={{ color: "#888" }}>
                              👤 Tài xế: <code style={{ background: "#f0f0f0", padding: "1px 6px", borderRadius: 4 }}>{r.driverId.substring(0, 8)}...</code>
                            </span>
                          ) : (
                            <span style={{ color: "#aaa", fontSize: 12 }}>👤 Tài xế: —</span>
                          )}
                          {r.fare && (
                            <span style={{ fontWeight: 700, color: "#00838f" }}>
                              💰 {r.fare.toLocaleString()} {r.currency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline / Events */}
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
          <div style={{ background: "white", borderRadius: 16, padding: 32, width: 400, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#333" }}>👤 Hồ sơ của tôi</h2>
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
            </div>
            {profileSaved && <div style={{ marginTop: 12, color: "#2e7d32", fontWeight: 600, fontSize: 14 }}>✅ Đã lưu thành công!</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setProfileOpen(false)}
                style={{ flex: 1, padding: 12, borderRadius: 8, background: "#f5f5f5", border: "none", fontWeight: 600, cursor: "pointer" }}>Đóng</button>
              <button disabled={profileSaving}
                onClick={async () => {
                  setProfileSaving(true); setProfileSaved(false);
                  try {
                    await updateProfile({ fullName: profileFullName, phone: profilePhone });
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