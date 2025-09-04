/**
 * Checks if the error has a specific HTTP status code.
 * @param error - The error object to check.
 * @param status - The HTTP status code to compare against.
 * @returns True if the error has the specified status code, false otherwise.
 */
export const isErrorWithStatus = (
  error: any,
  statusToCheck: number,
): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as any).status === "number" &&
    (error as any).status !== null &&
    (error as any).status === statusToCheck
  );
};
