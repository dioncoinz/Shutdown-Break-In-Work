"use client";

export default function DeleteButton({ id }: { id: string }) {
  async function del() {
    const ok = confirm("Delete this request?");
    if (!ok) return;

    const res = await fetch(`/api/break-in/${id}/delete`, { method: "POST" });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }

    // refresh to update the table
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={del}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1,
      }}
      title="Delete"
      aria-label="Delete"
    >
      🗑️
    </button>
  );
}
