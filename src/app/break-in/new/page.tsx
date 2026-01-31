"use client";

import { useState } from "react";

type ResourceLine = { resource_type: string; hours: string };

export default function NewBreakInRequestPage() {
  const [woNumber, setWoNumber] = useState("");
  const [woTitle, setWoTitle] = useState("");
  const [reason, setReason] = useState("");
  const [consequence, setConsequence] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState("P2");
  const [requestorName, setRequestorName] = useState("");
  const [requestorEmail, setRequestorEmail] = useState("");

  const [resources, setResources] = useState<ResourceLine[]>([
    { resource_type: "Mech", hours: "4" },
  ]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function updateResource(i: number, field: keyof ResourceLine, value: string) {
    setResources((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  function addResource() {
    setResources((prev) => [...prev, { resource_type: "", hours: "" }]);
  }

  function removeResource(i: number) {
    setResources((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload = {
      wo_number: woNumber.trim(),
      wo_title: woTitle.trim(),
      reason: reason.trim(),
      consequence: consequence.trim(),
      area: area.trim(),
      priority,
      requestor_name: requestorName.trim() || "Unknown",
      requestor_email: requestorEmail.trim() || "unknown@unknown",
      resources: resources
        .filter((r) => r.resource_type.trim() && r.hours.trim())
        .map((r) => ({
          resource_type: r.resource_type.trim(),
          hours: Number(r.hours),
        })),
    };

    const res = await fetch("/api/break-in/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (!res.ok) {
      setMsg(`❌ ${data?.error || "Failed to submit"}`);
      return;
    }

    setMsg("✅ Submitted!");
    // reset
    setWoNumber("");
    setWoTitle(""); 
    setReason("");
    setConsequence("");
    setArea("");
    setPriority("P2");
    setResources([{ resource_type: "Mech", hours: "4" }]);
  }

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>New Break-in Work Request</h1>

      <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input
          value={woNumber}
          onChange={(e) => setWoNumber(e.target.value)}
          placeholder="WO Number"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          required
        />
        <div style={{ marginBottom: 12 }}>
  <label style={{ fontWeight: 700 }}>WO Title</label>
  <input
    type="text"
    value={woTitle}
    onChange={(e) => setWoTitle(e.target.value)}
    placeholder="e.g. Replace CV031 head pulley"
    style={{
      width: "100%",
      padding: 10,
      border: "1px solid #ccc",
      borderRadius: 8,
      marginTop: 6,
    }}
  />
</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Area (331 / 332 / etc)"
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            value={requestorName}
            onChange={(e) => setRequestorName(e.target.value)}
            placeholder="Requestor name"
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
          <input
            value={requestorEmail}
            onChange={(e) => setRequestorEmail(e.target.value)}
            placeholder="Requestor email"
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason work needs to be done"
          style={{
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
            minHeight: 90,
          }}
          required
        />

        <textarea
          value={consequence}
          onChange={(e) => setConsequence(e.target.value)}
          placeholder="Consequence if not completed"
          style={{
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
            minHeight: 90,
          }}
          required
        />

        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Resources</h2>

          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {resources.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px 90px",
                  gap: 8,
                }}
              >
                <input
                  value={r.resource_type}
                  onChange={(e) => updateResource(i, "resource_type", e.target.value)}
                  placeholder="Resource type (Mech / Elec / Rigger...)"
                  style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                />
                <input
                  value={r.hours}
                  onChange={(e) => updateResource(i, "hours", e.target.value)}
                  placeholder="Hours"
                  style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
                />
                <button
                  type="button"
                  onClick={() => removeResource(i)}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                  disabled={resources.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addResource}
            style={{ marginTop: 10, padding: 10, borderRadius: 8, border: "1px solid #000" }}
          >
            + Add resource
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #000",
            fontWeight: 700,
          }}
        >
          {saving ? "Saving..." : "Submit Request"}
        </button>

        {msg && <p style={{ marginTop: 6 }}>{msg}</p>}
      </form>
    </div>
  );
}
