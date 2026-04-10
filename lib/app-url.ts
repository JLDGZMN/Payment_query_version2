function hasProtocol(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);
}

function isLocalHost(value: string) {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(value);
}

export function normalizeConfiguredUrl(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const candidate = hasProtocol(trimmed)
    ? trimmed
    : `${isLocalHost(trimmed) ? "http" : "https"}://${trimmed}`;

  try {
    const normalized = new URL(candidate);
    normalized.hash = "";
    normalized.search = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}
