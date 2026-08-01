export const themePresets = [
  { id: "default", name: "Default", description: "Professional graphite and amber", colors: ["#252525", "#f59e0b"], accent: "#f59e0b" },
  { id: "ocean", name: "Ocean", description: "Calm teal and turquoise tones", colors: ["#0e7490", "#2dd4bf"], accent: "#0891b2" },
  { id: "forest", name: "Forest", description: "Natural green and lime palette", colors: ["#166534", "#84cc16"], accent: "#16a34a" },
  { id: "sunset", name: "Sunset", description: "Warm orange and golden highlights", colors: ["#ea580c", "#eab308"], accent: "#f97316" },
  { id: "royal", name: "Royal", description: "Rich violet and magenta accents", colors: ["#7e22ce", "#ec4899"], accent: "#9333ea" },
];

export const accentColors = {
  Preset: null,
  Indigo: "#4f46e5",
  Blue: "#2563eb",
  Emerald: "#059669",
  Amber: "#d97706",
  Rose: "#e11d48",
};

export function resolvedThemeMode(mode) {
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
}
