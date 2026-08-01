export const soundOptions = [
  {
    value: "chime",
    label: "Chime",
    description: "Pleasant chime tone",
    src: "/sounds/chime.mov",
    frequency: 660,
  },
  {
    value: "bell",
    label: "Bell",
    description: "Classic bell ring",
    src: "/sounds/bell.mp4",
    frequency: 880,
  },
  {
    value: "pop",
    label: "Pop",
    description: "Quick pop sound",
    src: "/sounds/pop.mov",
    frequency: 520,
  },
  {
    value: "ding",
    label: "Ding",
    description: "Short ding alert",
    src: "/sounds/ding.mp4",
    frequency: 780,
  },
  {
    value: "blip",
    label: "Blip",
    description: "Digital blip tone",
    src: "/sounds/blip.mov",
    frequency: 620,
  },
  {
    value: "whoosh",
    label: "Whoosh",
    description: "Soft whoosh effect",
    src: "/sounds/whoosh.mp4",
    frequency: 420,
  },
  {
    value: "ping",
    label: "Ping",
    description: "Crisp ping sound",
    src: "/sounds/ping.mp4",
    frequency: 980,
  },
  {
    value: "click",
    label: "Click",
    description: "Subtle click",
    src: "/sounds/click.mp4",
    frequency: 700,
  },
  {
    value: "water-drop",
    label: "Water Drop",
    description: "Water drop effect",
    src: "/sounds/water-drop.mp4",
    frequency: 560,
  },
  {
    value: "sparkle",
    label: "Sparkle",
    description: "Magical sparkle",
    src: "/sounds/sparkle.mp4",
    frequency: 1040,
  },
  {
    value: "none",
    label: "Silent",
    description: "No alert sound",
    src: "",
    frequency: 0,
  },
];

export const getNotificationSound = (soundKey) =>
  soundOptions.find((sound) => sound.value === soundKey) ||
  soundOptions[0];

const playGeneratedTone = async (selected) => {
  const AudioContext =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.frequency.value = selected.frequency || 660;
  oscillator.type = ["pop", "blip"].includes(selected.value)
    ? "triangle"
    : "sine";

  gain.gain.setValueAtTime(0.001, context.currentTime);

  gain.gain.exponentialRampToValueAtTime(
    0.13,
    context.currentTime + 0.02
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + 0.28
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.3);

  oscillator.addEventListener("ended", () => {
    context.close().catch(() => {});
  });
};

export const playNotificationSound = async (soundKey) => {
  const selected = getNotificationSound(soundKey);

  if (selected.value === "none") return;

  if (selected.src) {
    try {
      const audio = new Audio(selected.src);

      audio.currentTime = 0;
      await audio.play();

      return;
    } catch {
      // If the file is missing or autoplay is blocked,
      // the generated notification tone is used.
    }
  }

  await playGeneratedTone(selected);
};