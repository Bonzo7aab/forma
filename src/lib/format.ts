const fractionDigits = (unit: string) => {
  if (unit === "s") return 2;
  if (unit === "cm" || unit === "powt.") return 0;
  return 1;
};

export function formatValue(value: number, unit: string) {
  const digits = fractionDigits(unit);
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDelta(current: number, previous: number, unit: string) {
  const delta = current - previous;
  if (Math.abs(delta) < 0.00001) return "0";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatValue(Math.abs(delta), unit)}`;
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

export function sessionLabel(session: { year: number; quarter: number }) {
  return `${session.year} Q${session.quarter}`;
}

export function directionCopy(higherIsBetter: boolean) {
  return higherIsBetter ? "Wyższy wynik jest lepszy" : "Niższy wynik jest lepszy";
}

export function scoreTone(current: number, previous: number, higherIsBetter: boolean) {
  const delta = current - previous;
  if (Math.abs(delta) < 0.00001) return "flat" as const;
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  return improved ? ("up" as const) : ("down" as const);
}

export function dateInputToUtc(isoDate: string) {
  return Date.parse(`${isoDate}T12:00:00.000Z`);
}

export function utcToDateInput(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function errorText(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data: unknown }).data;
    if (typeof data === "string" && data.trim()) return data;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.replace(/^\[CONVEX[^\]]*\]\s*/, "").replace(/^Uncaught ConvexError:\s*/, "");
  }
  return "Nie udało się zapisać zmian.";
}
