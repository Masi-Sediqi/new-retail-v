import axios from "axios";
import { apiUrl } from "./api";

export async function loadBackupCollectionNames() {
  const response = await axios.get(apiUrl("collections"));
  return Array.isArray(response.data) ? response.data : [];
}

export async function buildBackupPayload() {
  const collections = await loadBackupCollectionNames();
  const entries = await Promise.all(
    collections.map(async (name) => {
      const response = await axios.get(apiUrl(name));
      return [name, Array.isArray(response.data) ? response.data : []];
    })
  );

  return {
    app: "Smart Office",
    exportedAt: new Date().toISOString(),
    collections: Object.fromEntries(entries),
  };
}

export async function downloadBackup(reason = "manual") {
  const payload = await buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  link.href = url;
  link.download = `isp-data-${reason}-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return payload;
}
