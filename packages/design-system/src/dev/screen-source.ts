/** Development-only neutral image for stateless component stories. */
export const screenSource =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='400'%3E%3Crect width='240' height='400' fill='%23f1f5f9'/%3E%3Ctext x='120' y='200' text-anchor='middle' fill='%23334155'%3EScreen content%3C/text%3E%3C/svg%3E";

/** Explicit screenshot geometry fixtures, not product content. */
export const screenShapes = [
  { label: "Portrait", width: 840, height: 1520 },
  { label: "Landscape", width: 1600, height: 900 },
  { label: "Square", width: 1000, height: 1000 },
  { label: "Tall", width: 480, height: 3000 },
  { label: "Wide", width: 3000, height: 480 },
].map(({ label, width, height }) => ({
  label,
  source: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f6f7f9"/><path d="M0 64H${width}" stroke="#b9c3d0"/><text x="24" y="40" font-family="sans-serif" font-size="24" fill="#1a2333">${label} screenshot fixture</text></svg>`)}`,
}));
