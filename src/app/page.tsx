import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Shutdown Break-in Work</h1>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <Link href="/break-in/new">Create Request</Link>
        <Link href="/break-in/dashboard">Dashboard</Link>
      </div>
    </div>
  );
}
