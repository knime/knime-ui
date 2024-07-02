export const matchesQuery = (query: string, input: string) => {
  // Replace forbidden character only at the beginning of the query
  const forbiddenCharacters = /^[*?#:";<>%~|/\\]+/;
  const cleanedQuery = query.replace(forbiddenCharacters, "");

  return new RegExp(cleanedQuery, "i").test(input);
};
