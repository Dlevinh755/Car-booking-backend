import { useEffect, useMemo, useState } from "react";
import { geoAutocomplete, geoPlace } from "../api/geo";
import type { GeoSuggestion } from "../api/geo";

type Value = { label: string; lat: number; lng: number };

export function PlaceSearchInput({
  label,
  value,
  onChange,
  biasLatLng,
}: {
  label: string;
  value: Value | null;
  onChange: (v: Value | null) => void;
  biasLatLng?: { lat: number; lng: number } | null;
}) {
  const [text, setText] = useState(value?.label || "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GeoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText(value?.label || "");
  }, [value?.label]);

  const q = useMemo(() => text.trim(), [text]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const resp = await geoAutocomplete({
          q,
          lat: biasLatLng?.lat,
          lng: biasLatLng?.lng,
          limit: 8,
        });
        setItems(resp.suggestions || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, biasLatLng?.lat, biasLatLng?.lng]);

  async function selectItem(it: GeoSuggestion) {
    setOpen(false);
    setLoading(true);
    try {
      // ưu tiên location nếu autocomplete trả luôn
      if (it.location?.lat != null && it.location?.lng != null) {
        onChange({ label: it.text, lat: it.location.lat, lng: it.location.lng });
        setText(it.text);
        return;
      }
      const details = await geoPlace(it.placeId);
      if (!details.location) throw new Error("No location");
      const label = details.formattedAddress || details.name || it.text;
      onChange({ label, lat: details.location.lat, lng: details.location.lng });
      setText(label);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Gõ địa điểm…"
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />
      {loading && <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>Loading…</div>}

      {open && items.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 74,
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            zIndex: 10,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {items.map((it) => (
            <div
              key={it.placeId}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(it)}
              style={{ padding: 10, cursor: "pointer", borderTop: "1px solid #eee" }}
            >
              <div style={{ fontWeight: 600 }}>{it.text}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {it.distanceMeters != null ? `${it.distanceMeters}m` : ""} {it.types?.[0] ? `• ${it.types[0]}` : ""}
              </div>
            </div>
          ))}
          <div style={{ padding: 10, fontSize: 12, color: "#888" }} onClick={() => setOpen(false)}>
            Đóng
          </div>
        </div>
      )}
    </div>
  );
}