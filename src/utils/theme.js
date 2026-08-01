export const themePresets = [
  { id: "default", name: "Default", description: "Professional graphite and amber", colors: ["#252525", "#f59e0b"], accent: "#f59e0b", deep: "#252525", canvas: "#f7f5f1", soft: "#fff7e6", border: "#f2d6a2" },
  { id: "ocean", name: "Ocean", description: "Calm teal and turquoise tones", colors: ["#0e7490", "#2dd4bf"], accent: "#0891b2", deep: "#164e63", canvas: "#ecfeff", soft: "#cffafe", border: "#a5f3fc" },
  { id: "forest", name: "Forest", description: "Natural green and lime palette", colors: ["#166534", "#84cc16"], accent: "#16a34a", deep: "#14532d", canvas: "#f0fdf4", soft: "#dcfce7", border: "#bbf7d0" },
  { id: "sunset", name: "Sunset", description: "Warm orange and golden highlights", colors: ["#ea580c", "#eab308"], accent: "#f97316", deep: "#7c2d12", canvas: "#fff7ed", soft: "#ffedd5", border: "#fed7aa" },
  { id: "royal", name: "Royal", description: "Rich violet and magenta accents", colors: ["#7e22ce", "#ec4899"], accent: "#9333ea", deep: "#581c87", canvas: "#faf5ff", soft: "#f3e8ff", border: "#e9d5ff" },
  { id: "midnight", name: "Midnight", description: "Deep navy with electric blue", colors: ["#0f172a", "#2563eb"], accent: "#2563eb", deep: "#0f172a", canvas: "#eff6ff", soft: "#dbeafe", border: "#bfdbfe" },
  { id: "crimson", name: "Crimson", description: "Bold red and coral highlights", colors: ["#991b1b", "#fb7185"], accent: "#dc2626", deep: "#450a0a", canvas: "#fff1f2", soft: "#ffe4e6", border: "#fecdd3" },
  { id: "slate", name: "Slate", description: "Modern slate with sky blue", colors: ["#334155", "#0ea5e9"], accent: "#0284c7", deep: "#1e293b", canvas: "#f8fafc", soft: "#e0f2fe", border: "#bae6fd" },
  { id: "lavender", name: "Lavender", description: "Soft indigo and lavender", colors: ["#4f46e5", "#a78bfa"], accent: "#6366f1", deep: "#312e81", canvas: "#f5f3ff", soft: "#ede9fe", border: "#ddd6fe" },
  { id: "coffee", name: "Coffee", description: "Warm coffee and caramel tones", colors: ["#78350f", "#d97706"], accent: "#b45309", deep: "#3f2a1d", canvas: "#fffbeb", soft: "#fef3c7", border: "#fde68a" },
];

export const accentColors = {
  Preset: null,
  Indigo: "#4f46e5",
  Blue: "#2563eb",
  Emerald: "#059669",
  Amber: "#d97706",
  Rose: "#e11d48",
};

export const themeModeStorageKey = "isp-theme-mode";

export function setThemeModeOverride(mode) {
  const normalized = mode === "Dark" ? "Dark" : "Light";
  localStorage.setItem(themeModeStorageKey, normalized);
  document.body.classList.toggle("dark-mode", normalized === "Dark");
  window.dispatchEvent(new CustomEvent("app-theme-mode-changed", { detail: { mode: normalized } }));
}

export function resolvedThemeMode(mode) {
  const savedMode = localStorage.getItem(themeModeStorageKey);
  if (savedMode === "Dark" || savedMode === "Light") return savedMode.toLowerCase();
  if (mode !== "System") return mode.toLowerCase();
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme({ themePreset = "default", themeMode = "System", accentColor = "Preset", sidebarCompact = false, interfaceDensity = "Comfortable", cornerStyle = "Rounded" } = {}) {
  const preset = themePresets.find((item) => item.id === themePreset) || themePresets[0];
  const accent = accentColors[accentColor] || preset.accent;
  const mode = resolvedThemeMode(themeMode);
  const root = document.documentElement;
  document.body.classList.toggle("dark-mode", mode === "dark");
  document.body.dataset.theme = preset.id;
  document.body.dataset.density = String(interfaceDensity).toLowerCase();
  document.body.dataset.corners = String(cornerStyle).toLowerCase();
  document.body.classList.toggle("compact-sidebar", Boolean(sidebarCompact));
  root.style.setProperty("--app-accent", accent);
  root.style.setProperty("--app-accent-soft", `${accent}1a`);
  root.style.setProperty("--app-gradient", `linear-gradient(90deg, ${preset.colors[0]}, ${preset.colors[1]})`);
  root.style.setProperty("--theme-deep", preset.deep);
  root.style.setProperty("--theme-canvas", preset.canvas);
  root.style.setProperty("--theme-soft", preset.soft);
  root.style.setProperty("--theme-border", preset.border);
}
