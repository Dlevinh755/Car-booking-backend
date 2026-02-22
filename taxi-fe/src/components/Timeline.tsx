import type { RealtimeEvent } from "../sse/useSSE";

export function Timeline({ events }: { events: RealtimeEvent[] }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, maxHeight: 360, overflow: "auto" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Realtime Events</div>
      {events.length === 0 && <div style={{ color: "#666" }}>No events yet</div>}
      {events.map((e, idx) => (
        <div key={idx} style={{ padding: "8px 0", borderTop: idx === 0 ? "none" : "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{e.eventName}</b>
            <span style={{ color: "#888", fontSize: 12 }}>{new Date(e.ts).toLocaleTimeString()}</span>
          </div>
          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(e.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}