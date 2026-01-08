export const matchesQuery = (query: string, input: string) => {
  // Escape special characters in the query
  const charactersToEscape = /[.*+$^?#:";<>()%~|/\\[\]]/g;
  const cleanedQuery = query.replace(charactersToEscape, "\\$&");

  return new RegExp(cleanedQuery, "i").test(input);
};
