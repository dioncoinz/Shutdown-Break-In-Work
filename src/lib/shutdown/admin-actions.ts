export function shutdownAdminActionsEnabled() {
  return process.env.SHUTDOWN_ADMIN_ACTIONS_ENABLED === "true";
}
