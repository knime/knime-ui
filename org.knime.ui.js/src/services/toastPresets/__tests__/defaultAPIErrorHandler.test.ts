import { describe, expect, it, vi } from "vitest";

import { rfcErrors } from "@knime/hub-features";

import { getToastsProvider } from "@/plugins/toasts";
import { defaultAPIErrorHandler } from "../defaultAPIErrorHandler";

vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    rfcErrors: {
      // @ts-expect-error
      ...actual.rfcErrors,
      toToast: vi.fn(),
    },
  };
});

describe("defaultAPIErrorHandler", () => {
  const $toast = getToastsProvider();

  it.each([
    ["Expected Gateway API error", -32600, true],
    ["Unxpected Gateway API error", -32601, false],
    ["Desktop API error", 0, false],
  ])("should handle %s", (_, code, canCopyToClipboard) => {
    const error = {
      code: "ServiceCallException",
      title: "The title",
      date: new Date("2025-10-19").toISOString(),
      "x-request-id": "1234567",
      status: 422,
      details: ["Detail line 1", "Detail line 2"],
      canCopy: canCopyToClipboard,
    };

    defaultAPIErrorHandler($toast, error, {
      headline: "The headline for context",
    });

    const { rfcError } = vi.mocked(rfcErrors.toToast).mock.calls[0][0];
    expect(rfcErrors.toToast).toHaveBeenCalledWith(
      expect.objectContaining({
        headline: "The headline for context",
        canCopyToClipboard,
      }),
    );
    expect(rfcError).toBeInstanceOf(rfcErrors.RFCError);
    expect(rfcError.data.title).toBe(error.title);
    expect(rfcError.data.details).toEqual(error.details);
    expect(rfcError.data.requestId).toEqual(error["x-request-id"]);
    expect(rfcError.data.status).toEqual(error.status);
    expect(rfcError.data.date).toEqual(new Date(error.date));
  });

  it("should handle Hub API errors", () => {
    const error = new rfcErrors.RFCError({
      title: "Some hub error",
      date: new Date("2025-10-19"),
      details: ["Detail line 1", "Detail line 2"],
      requestId: "1234567",
      status: 500,
    });

    defaultAPIErrorHandler($toast, error, {
      headline: "The headline for context",
    });

    expect(rfcErrors.toToast).toHaveBeenCalledWith(
      expect.objectContaining({
        headline: "The headline for context",
        rfcError: error,
        canCopyToClipboard: true,
      }),
    );
  });

  it("add message from an error class to toast if no message provided in payload", () => {
    const $toast = getToastsProvider();
    const message = "the actual error message";
    const headline = "Some Error";

    defaultAPIErrorHandler($toast, new Error(message), { headline });
    expect(rfcErrors.toToast).toHaveBeenCalled();
  });

  it("does not modify the message if one was given", () => {
    const $toast = getToastsProvider();
    const headline = "Some Error";
    defaultAPIErrorHandler($toast, new Error("the error message"), {
      headline,
      message: "custom payload message",
    });
    expect($toast.show).toBeCalledWith({
      headline,
      message: "custom payload message",
    });
  });

  it("forwards extra params in payload to the $toast.show", () => {
    const $toast = getToastsProvider();
    const payload = {
      message: "msg",
      headline: "headline",
      someThingOther: 2,
    };
    defaultAPIErrorHandler($toast, new Error(), payload);
    expect($toast.show).toBeCalledWith(payload);
  });
});
