/**
 * Formats a Date or ISO timestamp string as a local `YYYY-MM-DDTHH:mm` string
 * suitable for `<input type="datetime-local">` without shifting by UTC offset.
 */
export function toLocalDateTimeInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Checks whether an optional startsAt/endsAt schedule window is active at `now`.
 */
export function isWithinScheduleWindow(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
  now: Date = new Date(),
): boolean {
  const nowMs = now.getTime();
  if (startsAt) {
    const startMs = new Date(startsAt).getTime();
    if (!Number.isNaN(startMs) && nowMs < startMs) return false;
  }
  if (endsAt) {
    const endMs = new Date(endsAt).getTime();
    if (!Number.isNaN(endMs) && nowMs > endMs) return false;
  }
  return true;
}

/**
 * Formats a monetary value using the storefront's dynamic currency settings.
 */
export function formatStoreCurrency(
  amount: number,
  currency?: { symbol?: string; position?: 'prefix' | 'suffix' | 'before' | 'after' } | null,
): string {
  const symbol = currency?.symbol || '৳';
  const position = currency?.position || 'prefix';
  const formatted = Math.round(Number(amount) || 0).toLocaleString('en-IN');
  return position === 'suffix' || position === 'after' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
