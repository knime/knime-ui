export const optional = <T>(condition: boolean, value: T) =>
  condition ? [value] : [];
