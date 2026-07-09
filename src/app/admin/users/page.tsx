import { AppSidebar } from "@/components/AppSidebar";
import { requireAdminUser } from "@/lib/auth/current-user";
import { listAppUsers } from "@/lib/auth/users";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111",
  background: "#fff",
} as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string; invited?: string; updated?: string }>;
}) {
  const currentUser = await requireAdminUser();
  const users = await listAppUsers();
  const sp = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        display: "grid",
        gridTemplateColumns: "176px minmax(0, 1fr)",
      }}
    >
      <AppSidebar active="users" user={currentUser} />
      <main style={{ minWidth: 0, padding: 28 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ color: "#ea580c", fontWeight: 900, fontSize: 13 }}>Admin</div>
            <h1 style={{ margin: 0, color: "#111", fontSize: 26, fontWeight: 900 }}>
              Users
            </h1>
          </div>
        </header>

        {(sp.created || sp.invited || sp.updated || sp.deleted || sp.error) && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 8,
              border: sp.error ? "1px solid #fecaca" : "1px solid #bbf7d0",
              background: sp.error ? "#fef2f2" : "#f0fdf4",
              color: sp.error ? "#991b1b" : "#166534",
              fontWeight: 800,
            }}
          >
            {sp.error || (sp.updated ? "User updated." : sp.deleted ? "User deleted." : "Invite sent.")}
          </div>
        )}

        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "minmax(300px, 380px) 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ margin: 0, color: "#111", fontSize: 18, fontWeight: 900 }}>
              Invite dashboard user
            </h2>

            <form action="/api/admin/users" method="post" style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <label>
                <FieldLabel>Name</FieldLabel>
                <input name="full_name" style={inputStyle} placeholder="Dion George" />
              </label>

              <label>
                <FieldLabel>Email</FieldLabel>
                <input name="email" type="email" required style={inputStyle} />
              </label>

              <label>
                <FieldLabel>Role</FieldLabel>
                <select name="role" defaultValue="admin" style={inputStyle}>
                  <option value="admin">Admin</option>
                  <option value="planner">Planner</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="superintendent">Superintendent</option>
                  <option value="manager">Manager</option>
                </select>
              </label>

              <button
                type="submit"
                style={{
                  marginTop: 4,
                  padding: "11px 14px",
                  borderRadius: 8,
                  border: "1px solid #ea580c",
                  background: "#f97316",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Send invite
              </button>
            </form>
          </section>

          <section
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Password</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const formId = `user-${user.id}`;
                  const isCurrentUser = user.id === currentUser.id;
                  const isPendingInvite = Boolean(user.invited_at && !user.invite_accepted_at);

                  return (
                    <tr key={user.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <Td>
                        <form id={formId} action="/api/admin/users" method="post" />
                        <input form={formId} type="hidden" name="_action" value="update" />
                        <input form={formId} type="hidden" name="id" value={user.id} />
                        <input
                          form={formId}
                          name="full_name"
                          defaultValue={user.full_name || ""}
                          style={tableInputStyle}
                          placeholder="Name"
                        />
                      </Td>
                      <Td>
                        <input
                          form={formId}
                          name="email"
                          type="email"
                          required
                          defaultValue={user.email}
                          style={tableInputStyle}
                        />
                      </Td>
                      <Td>
                        <select form={formId} name="role" defaultValue={user.role} style={tableInputStyle}>
                          <option value="admin">Admin</option>
                          <option value="planner">Planner</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="superintendent">Superintendent</option>
                          <option value="manager">Manager</option>
                        </select>
                      </Td>
                      <Td>
                        <div style={{ display: "grid", gap: 7 }}>
                          <span style={statusBadgeStyle(user.is_active, isPendingInvite)}>
                            {isPendingInvite ? "Pending Invite" : user.is_active ? "Active" : "Disabled"}
                          </span>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                          <input form={formId} name="is_active" type="checkbox" defaultChecked={user.is_active} />
                          Active
                          </label>
                        </div>
                      </Td>
                      <Td>
                        <input
                          form={formId}
                          name="password"
                          type="password"
                          minLength={8}
                          style={tableInputStyle}
                          placeholder="Leave unchanged"
                        />
                      </Td>
                      <Td>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                          <button type="submit" form={formId} style={saveButtonStyle}>
                            Save
                          </button>
                          {isPendingInvite ? (
                            <form action="/api/admin/users" method="post">
                              <input type="hidden" name="_action" value="resend-invite" />
                              <input type="hidden" name="id" value={user.id} />
                              <button type="submit" style={resendButtonStyle}>
                                Resend
                              </button>
                            </form>
                          ) : null}
                          <form action="/api/admin/users" method="post">
                            <input type="hidden" name="_action" value="delete" />
                            <input type="hidden" name="id" value={user.id} />
                            <button
                              type="submit"
                              disabled={isCurrentUser}
                              title={isCurrentUser ? "You cannot delete your own signed-in user." : "Delete user"}
                              style={deleteButtonStyle(isCurrentUser)}
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  );
                })}

                {users.length === 0 ? (
                  <tr>
                    <Td>No users found.</Td>
                    <Td />
                    <Td />
                    <Td />
                    <Td />
                    <Td />
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>
      </div>
      </main>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", marginBottom: 6, color: "#111", fontWeight: 800 }}>
      {children}
    </span>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: 14, color: "#111", fontSize: 13 }}>{children}</th>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td style={{ padding: 14, color: "#111", fontSize: 14, fontWeight: 600 }}>{children}</td>;
}

const tableInputStyle = {
  width: "100%",
  minWidth: 130,
  padding: "8px 9px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  color: "#111",
  fontSize: 13,
  fontWeight: 700,
} as const;

const saveButtonStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ea580c",
  background: "#f97316",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const resendButtonStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  fontWeight: 900,
  cursor: "pointer",
} as const;

function statusBadgeStyle(active: boolean, pending: boolean) {
  const color = pending ? "#d97706" : active ? "#16a34a" : "#6b7280";

  return {
    display: "inline-flex",
    width: "fit-content",
    padding: "4px 9px",
    borderRadius: 999,
    background: `${color}20`,
    color,
    fontSize: 12,
    fontWeight: 900,
  } as const;
}

function deleteButtonStyle(disabled: boolean) {
  return {
    padding: "8px 10px",
    borderRadius: 6,
    border: disabled ? "1px solid #e5e7eb" : "1px solid #fecaca",
    background: disabled ? "#f3f4f6" : "#fff",
    color: disabled ? "#9ca3af" : "#dc2626",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  } as const;
}
