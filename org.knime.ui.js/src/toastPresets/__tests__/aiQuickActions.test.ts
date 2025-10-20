import { describe, expect, it } from "vitest";

import { KaiQuickActionError } from "@/api/gateway-api/generated-api";
import { parseQuickActionError } from "../aiQuickActions";

describe("parseQuickActionError", () => {
  it("should parse FastAPI error with detail property", () => {
    const error = new Error(
      JSON.stringify({
        detail: {
          code: "QUOTA_EXCEEDED",
          message: "You have reached your monthly AI interaction limit of 100.",
        },
      }),
    );

    const result = parseQuickActionError(error);

    expect(result).toEqual({
      code: "QUOTA_EXCEEDED",
      message: "You have reached your monthly AI interaction limit of 100.",
    });
  });

  it("should parse error without detail property (fallback for future Go migration)", () => {
    const error = new Error(
      JSON.stringify({
        code: "LLM_ERROR",
        message: "AI model failed to process request.",
      }),
    );

    const result = parseQuickActionError(error);

    expect(result).toEqual({
      code: "LLM_ERROR",
      message: "AI model failed to process request.",
    });
  });

  it.each([
    ["LLM_ERROR", "AI model error"],
    ["QUOTA_EXCEEDED", "Quota exceeded"],
    ["TIMEOUT", "Request timeout"],
    ["VALIDATION_ERROR", "Invalid data"],
    ["AUTHENTICATION_FAILED", "Auth failed"],
    ["SERVICE_UNAVAILABLE", "Service down"],
    ["UNKNOWN", "Unknown error"],
  ])(
    "should correctly parse %s error code",
    (code: string, message: string) => {
      const error = new Error(JSON.stringify({ detail: { code, message } }));
      const result = parseQuickActionError(error);

      expect(result.code).toBe(code);
      expect(result.message).toBe(message);
    },
  );

  it.each([
    ["non-JSON errors", new Error("Network error occurred")],
    ["malformed JSON", new Error("{ invalid json")],
    [
      "JSON without code/message",
      new Error(JSON.stringify({ someOther: "property" })),
    ],
    ["non-Error objects", "Simple string error"],
    ["null/undefined errors", null],
  ])(
    "should use generic message for %s",
    (_description: string, error: unknown) => {
      const result = parseQuickActionError(error);

      expect(result).toEqual({
        code: KaiQuickActionError.CodeEnum.UNKNOWN,
        message: "An unexpected error occurred.",
      });
    },
  );
});
