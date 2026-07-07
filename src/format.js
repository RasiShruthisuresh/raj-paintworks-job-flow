export function formatINR(value) {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}
