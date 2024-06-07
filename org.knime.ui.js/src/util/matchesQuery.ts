export const matchesQuery = (query: string, input: string) =>
  new RegExp(query, "i").test(input);
