/** Wraps number into [0, 1). */
export const wrapToUnit = (x: number): number => ((x % 1) + 1) % 1;
