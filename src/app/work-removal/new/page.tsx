"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ResourceLine = { resource_type: string; hours: string };

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  color: "#111",
  background: "#fff",
} as const;

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 800,
  color: "#222",
} as const;

export default function NewWorkRemovalRequestPage() {
  const router = useRouter();
  const [woNumber, setWoNumber] = useState("");
  const [woTitle, setWoTitle] = useState("");
  const [reason, setReason] = useState("");
  const [consequence, setConsequence] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState("P2");
  const [requestorName, setRequestorName] = useState("");
  const [requestorEmail, setRequestorEmail] = useState("");
  const [resources, setResources] = useState<ResourceLine[]>([{ resource_type: "Mech", hours: "4" }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function updateResource(i: number, field: keyof ResourceLine, value: string) {
    setResources((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addResource() {
    setResources((prev) => [...prev, { resource_type: "", hours: "" }]);
  }

  function removeResource(i: number) {
    setResources((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const hasInvalidResource = resources.some(
      (resource) =>
        !resource.resource_type.trim() ||
        !resource.hours.trim() ||
        Number.isNaN(Number(resource.hours)) ||
        Number(resource.hours) <= 0
    );

    if (hasInvalidResource) {
      setMsg("Each removal resource row needs a resource type and hours greater than 0.");
      return;
    }

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
      requestor_email: requestorEmail.trim().toLowerCase() || null,
      resources: resources.map((r) => ({
        resource_type: r.resource_type.trim(),
        hours: Number(r.hours),
      })),
    };

    try {
      const res = await fetch("/api/work-removal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Failed to submit");
        return;
      }

      const successMessage = data?.emailWarning
        ? `Removal request submitted for approval, but email was not sent: ${data.emailWarning}`
        : "Removal request submitted for approval.";

      window.alert(successMessage);
      router.push("/");
    } catch {
      setMsg("Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", padding: 28 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#6b7280" }}>
              Work removal workflow
            </p>
            <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700, color: "#111" }}>
              New Work Removal Request
            </h1>
            <p style={{ margin: "10px 0 0", color: "#4b5563", lineHeight: 1.5 }}>
              Capture the work order details, why the work should be removed, and the hours being removed.
            </p>
          </div>

          <Link href="/break-in/dashboard" style={{ fontWeight: 600, color: "#111", textDecoration: "none", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={submit} style={{ marginTop: 22 }}>
          <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.06)", padding: 24 }}>
            <SectionTitle>Removal details</SectionTitle>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Field label="WO Number"><input value={woNumber} onChange={(e) => setWoNumber(e.target.value)} placeholder="Enter work order number" style={inputStyle} required /></Field>
              <Field label="WO Title"><input value={woTitle} onChange={(e) => setWoTitle(e.target.value)} placeholder="Enter work order title" style={inputStyle} /></Field>
              <Field label="Area"><input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area (331 / 332 / etc)" style={inputStyle} /></Field>
              <Field label="Priority">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>
              <Field label="Requestor name"><input value={requestorName} onChange={(e) => setRequestorName(e.target.value)} placeholder="Enter requestor name" style={inputStyle} /></Field>
              <Field label="Requestor email"><input type="email" value={requestorEmail} onChange={(e) => setRequestorEmail(e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              <Field label="Reason for removal"><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why should this work be removed?" style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} required /></Field>
              <Field label="Consequence if not removed"><textarea value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="What happens if this work stays in the shutdown scope?" style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} required /></Field>
            </div>
          </div>

          <div style={{ marginTop: 18, background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.06)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <SectionTitle>Removed hours</SectionTitle>
                <p style={{ margin: "6px 0 0", color: "#4b5563" }}>
                  Add the hours and resource types being removed from the work scope.
                </p>
              </div>

              <button type="button" onClick={addResource} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", color: "#111", fontWeight: 600, cursor: "pointer" }}>
                + Add resource
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {resources.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 160px 110px", gap: 10, padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  <input value={r.resource_type} onChange={(e) => updateResource(i, "resource_type", e.target.value)} placeholder="Resource type (Mech / Elec / Rigger...)" style={inputStyle} required />
                  <input type="number" min={0.5} step="0.5" value={r.hours} onChange={(e) => updateResource(i, "hours", e.target.value)} placeholder="Hours" style={inputStyle} required />
                  <button type="button" onClick={() => removeResource(i)} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: resources.length === 1 ? "#f3f4f6" : "#fff", color: "#111", fontWeight: 600, cursor: resources.length === 1 ? "not-allowed" : "pointer" }} disabled={resources.length === 1}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div>
              {msg && (
                <p style={{ margin: 0, color: msg.toLowerCase().includes("failed") ? "#dc2626" : "#166534", background: msg.toLowerCase().includes("failed") ? "#fef2f2" : "#f0fdf4", border: msg.toLowerCase().includes("failed") ? "1px solid #fecaca" : "1px solid #bbf7d0", borderRadius: 10, padding: "10px 12px", fontWeight: 600 }}>
                  {msg}
                </p>
              )}
            </div>

            <button type="submit" disabled={saving} style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #b45309", background: saving ? "#fcd34d" : "#d97706", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving..." : "Submit Removal Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}
