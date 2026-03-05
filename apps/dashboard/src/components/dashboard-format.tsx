export function formatNumber(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString();
}

export function formatDate(value: Date | string | null) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString();
}
