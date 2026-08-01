const textEncoder = new TextEncoder();

export const getPasswordStrength = (password) => {
  const value = String(password || "");
  let score = 0;

  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) {
    return {
      label: "",
      score: 0,
      tone: "empty",
    };
  }

  if (score <= 2) {
    return {
      label: "Weak",
      score: Math.max(1, score),
      tone: "weak",
    };
  }

  if (score <= 4) {
    return {
      label: "Good",
      score,
      tone: "good",
    };
  }

  return {
    label: "Strong",
    score,
    tone: "strong",
  };
};

export const hashPassword = async (password) => {
  const cryptoApi = window.crypto || globalThis.crypto;

  if (!cryptoApi?.subtle) {
    throw new Error("Secure password hashing is not supported.");
  }

  const digest = await cryptoApi.subtle.digest(
    "SHA-256",
    textEncoder.encode(String(password || ""))
  );

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
};