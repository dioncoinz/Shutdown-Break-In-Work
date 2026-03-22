"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ResourceLine = {
  id?: string;
  resource_type: string;
  hours: string;
};

export default function ResourcePlannerEditor({
  id,
  initialResources,
  savePath,
  title = "Planned hours",
  description = "Update resource lines after submission if the plan changes.",
  successMessage = "Planned hours updated.",
  errorMessage = "Failed to update planned hours.",
  buttonLabel = "Save planned hours",
}: {
  id: string;
  initialResources: ResourceLine[];
  savePath?: string;
  title?: string;
  description?: string;
  successMessage?: string;
  errorMessage?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceLine[]>(
    initialResources.length > 0 ? initialResources : [{ resource_type: "", hours: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function updateResource(index: number, field: keyof ResourceLine, value: string) {
    setResources((prev) =>
      prev.map((resource, currentIndex) =>
        currentIndex === index ? { ...resource, [field]: value } : resource
      )
    );
  }

  function addResource() {
    setResources((prev) => [...prev, { resource_type: "", hours: "" }]);
  }

  function removeResource(index: number) {
    setResources((prev) =>
      prev.length === 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function save() {
    if (saving) {
      return;
    }

    const payload = resources
      .map((resource) => ({
        id: resource.id,
        resource_type: resource.resource_type.trim(),
        hours: resource.hours.trim(),
      }))
      .filter((resource) => resource.resource_type || resource.hours);

    if (payload.length === 0) {
      setMsg("Add at least one resource and planned hour.");
      return;
    }

    const hasInvalidRow = payload.some(
      (resource) =>
        !resource.resource_type ||
        !resource.hours ||
        Number.isNaN(Number(resource.hours)) ||
        Number(resource.hours) <= 0
    );

    if (hasInvalidRow) {
      setMsg("Each resource needs a type and hours greater than 0.");
      return;
    }

    setSaving(true);
    setMsg(null);

    const res = await fetch(savePath || `/api/break-in/${id}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resources: payload.map((resource) => ({
          id: resource.id,
          resource_type: resource.resource_type,
          hours: Number(resource.hours),
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMsg(data?.error || errorMessage);
      return;
    }

    setMsg(successMessage);
    router.refresh();
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: 18,
        marginTop: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#111" }}>{title}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563" }}>{description}</div>
        </div>

        <button
          type="button"
          onClick={addResource}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
            color: "#111",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add resource
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {resources.map((resource, index) => (
          <div
            key={resource.id || `new-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 130px 110px",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            <input
              value={resource.resource_type}
              onChange={(e) => updateResource(index, "resource_type", e.target.value)}
              placeholder="Resource type"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                fontSize: 14,
                color: "#111",
                background: "#fff",
              }}
            />

            <input
              type="number"
              min={0}
              step="0.5"
              value={resource.hours}
              onChange={(e) => updateResource(index, "hours", e.target.value)}
              placeholder="Hours"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                fontSize: 14,
                color: "#111",
                background: "#fff",
              }}
            />

            <button
              type="button"
              onClick={() => removeResource(index)}
              disabled={resources.length === 1}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: resources.length === 1 ? "#f3f4f6" : "#fff",
                color: "#111",
                fontWeight: 700,
                cursor: resources.length === 1 ? "not-allowed" : "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#fff",
            color: "#111",
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : buttonLabel}
        </button>

        {msg && (
          <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes("updated") ? "#166534" : "#b91c1c" }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
