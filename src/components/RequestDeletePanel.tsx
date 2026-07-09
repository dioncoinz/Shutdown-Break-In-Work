export function RequestDeletePanel({ action }: { action: string }) {
  return (
    <form
      action={action}
      method="post"
      style={{
        marginTop: 14,
        background: "#fff",
        border: "1px solid #fecaca",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: 18,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 900, color: "#991b1b", marginBottom: 8 }}>
        Delete request
      </div>
      <p style={{ margin: "0 0 12px", color: "#7f1d1d", fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
        This permanently removes the request and its resources. The reason will be logged in the shutdown activity log.
      </p>
      <label>
        <div style={{ color: "#111", display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
          Deletion reason
        </div>
        <textarea
          name="reason"
          required
          rows={3}
          style={{
            width: "100%",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#111",
            fontWeight: 700,
            minHeight: 82,
            padding: "10px 12px",
            resize: "vertical",
          }}
        />
      </label>
      <button
        type="submit"
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #b91c1c",
          background: "#dc2626",
          color: "#fff",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Delete request
      </button>
    </form>
  );
}
