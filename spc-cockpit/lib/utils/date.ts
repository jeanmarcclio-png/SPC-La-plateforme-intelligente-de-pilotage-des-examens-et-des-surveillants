export function parseFRDate(s?: string): Date | null {
  if (!s) return null;
  const p = s.split("/");
  if (p.length !== 3) return null;
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}

export function calcJoursRestants(deadline: string): number {
  let target: Date;
  if (deadline.includes("-")) {
    target = new Date(deadline + "T00:00:00");
  } else {
    const [d, m, y] = deadline.split("/").map(Number);
    if (!d || !m || !y) return 0;
    target = new Date(y, m - 1, d);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}
