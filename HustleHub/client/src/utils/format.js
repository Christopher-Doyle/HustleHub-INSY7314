const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export function formatPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) ? currency.format(number) : '—';
}

export function truncate(text, max = 140) {
  const value = typeof text === 'string' ? text.trim() : '';
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
