export const MODULE_KEYS = {
  dashboard: "dashboard",
  suppliers: "suppliers",
  assets: "assets",
  mainStock: "mainStock",
  deviceTransfer: "deviceTransfer",
  customers: "customers",
  towerAssets: "towerAssets",
  reports: "reports",
  repair: "repair",
  userManagement: "userManagement",
  settings: "settings",
  agent: "agent",
};

export function isAdminUser(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

export function hasPermission(user, moduleKey, action = "view") {
  if (!user) return false;
  if (String(user.status || "Active").toLowerCase() !== "active") return false;
  if (isAdminUser(user)) return true;

  const permissions = user.permissions;
  if (!permissions || Object.keys(permissions).length === 0) return true;

  return Boolean(permissions?.[moduleKey]?.[action]);
}

export function canViewModule(user, moduleKey) {
  return hasPermission(user, moduleKey, "view");
}
