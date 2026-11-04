/**
 * Google Analytics 4 measurement ID from GA_MEASUREMENT_ID, or null when it's unset or
 * malformed. Analytics stays off until a valid ID is configured.
 */
export function measurementId(): string | null {
  const id = process.env.GA_MEASUREMENT_ID?.trim().toUpperCase();
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}
