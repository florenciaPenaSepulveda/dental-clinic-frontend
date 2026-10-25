export const cleanRut = (value: string): string => value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);

export const formatRut = (value: string): string => {
  const clean = cleanRut(value);
  if (clean.length <= 1) {
    return clean;
  }
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
};

export const isValidRut = (value: string): boolean => {
  const clean = cleanRut(value);
  if (clean.length < 8) {
    return false;
  }
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const rest = 11 - (sum % 11);
  const expected = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return dv === expected;
};
