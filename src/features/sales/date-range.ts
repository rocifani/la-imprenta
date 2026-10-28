function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number(value.slice(0, 4)) >= 1 && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function argentinaMidnight(value: string) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${value}T12:00:00Z`)).find((part) => part.type === "timeZoneName")!.value;
  const parts = offset.match(/GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?/);
  const seconds = parts ? (parts[1] === "+" ? 1 : -1) * (Number(parts[2]) * 3600 + Number(parts[3]) * 60 + Number(parts[4] ?? 0)) : 0;
  return new Date(new Date(`${value}T00:00:00Z`).getTime() - seconds * 1000).toISOString();
}

export function quoteDateRange(from = "", to = "") {
  if ((from && !validDate(from)) || (to && !validDate(to))) return { error: "Ingresá fechas válidas." };
  if (from && to && from > to) return { error: "La fecha desde no puede ser posterior a la fecha hasta." };
  const nextDay = to ? new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400000).toISOString().split("T")[0] : "";
  return { start: from ? argentinaMidnight(from) : undefined, end: nextDay ? argentinaMidnight(nextDay) : undefined };
}
