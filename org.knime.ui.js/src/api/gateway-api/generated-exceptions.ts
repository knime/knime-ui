export const KNOWN_EXECUTOR_EXCEPTIONS = [
  "ServiceCallException",
  "NetworkException",
  "NodeDescriptionNotAvailableException",
  "NodeNotFoundException",
  "NoSuchElementException",
  "NotASubWorkflowException",
  "InvalidRequestException",
  "OperationNotAllowedException",
  "IOException",
  "CollisionException",
] as const;
export type KnownExecutorExceptions =
  (typeof KNOWN_EXECUTOR_EXCEPTIONS)[number];

// the following exception classes are referenced in doc strings in generated-api.ts
export class RequiredError extends Error {}
export class ServiceCallException extends Error {}
export class NetworkException extends Error {}
export class NodeDescriptionNotAvailableException extends Error {}
export class NodeNotFoundException extends Error {}
export class NoSuchElementException extends Error {}
export class NotASubWorkflowException extends Error {}
export class InvalidRequestException extends Error {}
export class OperationNotAllowedException extends Error {}
export class IOException extends Error {}
export class CollisionException extends Error {}

function isObject(e: unknown): e is Exclude<object, any[]> {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}

const EXPECTED_EXCEPTION_CODE = -32600;
type ExpectedExceptionCode = typeof EXPECTED_EXCEPTION_CODE;
const UNEXPECTED_EXCEPTION_CODE = -32601;
type UnexpectedExceptionCode = typeof UNEXPECTED_EXCEPTION_CODE;

type FormattedApiError = {
  code: ExpectedExceptionCode | UnexpectedExceptionCode;
  data: {
    title: string;
    code: string;
    canCopy: boolean;
    message: string;
    stackTrace?: string;
  };
};
function isApiError(e: unknown): e is FormattedApiError {
  return (
    isObject(e) &&
    "code" in e &&
    typeof e.code === "number" &&
    [EXPECTED_EXCEPTION_CODE, UNEXPECTED_EXCEPTION_CODE].includes(e.code) &&
    "data" in e &&
    isObject(e.data) &&
    "code" in e.data &&
    typeof e.data.code === "string" &&
    "title" in e.data &&
    typeof e.data.title === "string" &&
    "canCopy" in e.data &&
    typeof e.data.canCopy === "boolean" &&
    "message" in e.data &&
    typeof e.data.message === "string"
  );
}

type ApiError<CODE extends KnownExecutorExceptions> = FormattedApiError & {
  code: ExpectedExceptionCode;
  data: { code: CODE };
};
export function isApiErrorType<CODE extends KnownExecutorExceptions>(
  e: unknown,
  code: CODE,
): e is ApiError<CODE> {
  return (
    isApiError(e) && e.code === EXPECTED_EXCEPTION_CODE && e.data.code === code
  );
}

type UnknownApiError = FormattedApiError & { code: UnexpectedExceptionCode };
export function isUnknownApiError(e: unknown): e is UnknownApiError {
  return isApiError(e) && e.code === UNEXPECTED_EXCEPTION_CODE;
}
