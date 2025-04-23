/* eslint-disable func-style */
import {
  type ApiErrorData,
  isApiErrorData,
} from "../gateway-api/generated-exceptions";

export type DesktopApiError = { code: number; data: ApiErrorData };

function isPlainObject(e: unknown): e is Exclude<object, any[]> {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}

export const DESKTOP_API_ERROR_CODE = 0;

export const isDesktopApiError = (e: unknown): e is DesktopApiError => {
  return (
    isPlainObject(e) &&
    "code" in e &&
    typeof e.code === "number" &&
    e.code === DESKTOP_API_ERROR_CODE &&
    "data" in e &&
    isApiErrorData(e.data)
  );
};
