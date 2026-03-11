export const isAuthError = (errorMessage: string) =>
  errorMessage.startsWith("Could not authorize") ||
  errorMessage.startsWith("Failed to authenticate");
