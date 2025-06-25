import { describe, expect, it, vi } from "vitest";

import { getToastsProvider } from "@/plugins/toasts";
import { showProblemDetailsErrorToast } from "@/util/showProblemDetailsErrorToast";
import { defaultErrorPresetHandler } from "../defaultErrorPresetHandler";

vi.mock("@/util/showProblemDetailsErrorToast", () => {
  return {
    showProblemDetailsErrorToast: vi.fn(),
  };
});

describe("defaultErrorPresetHandler", () => {
  it("should handle UnknownGatewayException", () => {
    const message = "~~~~ not known ~~~~";
    const unknownGatewayException = {
      code: -32601,
      data: {
        code: "UnknownException",
        title: message,
        canCopy: true,
        message,
      },
    };
    const $toast = getToastsProvider();
    defaultErrorPresetHandler($toast, unknownGatewayException, {});

    expect(showProblemDetailsErrorToast).toBeCalledWith({
      headline: "An unexpected error occurred",
      problemDetails: {
        details: [],
        title: "~~~~ not known ~~~~",
      },
      error: unknownGatewayException,
      copyToClipboard: true,
    });
  });

  it("add message from an error class to toast if no message provided in payload", () => {
    const $toast = getToastsProvider();
    const message = "the actual error message";
    const headline = "Some Error";
    defaultErrorPresetHandler($toast, new Error(message), {
      headline,
    });
    expect($toast.show).toBeCalledWith({
      headline,
      message,
    });
  });

  it("does not touch the message if one was given", () => {
    const $toast = getToastsProvider();
    const headline = "Some Error";
    defaultErrorPresetHandler($toast, new Error("the error message"), {
      headline,
      message: "custom payload message",
    });
    expect($toast.show).toBeCalledWith({
      headline,
      message: "custom payload message",
    });
  });

  it("just pass everything in payload to the $toast.show", () => {
    const $toast = getToastsProvider();
    const payload = {
      message: "msg",
      headline: "headline",
      someThingOther: 2,
    };
    defaultErrorPresetHandler($toast, new Error(), payload);
    expect($toast.show).toBeCalledWith(payload);
  });
});
