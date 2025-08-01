export const clamp = (val: number, min: number, max: number) => {
  return Math.max(min, Math.min(val, max));
};

export const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
