import { describe, expect, it } from "vitest";

import {
  AlertType,
  INTERNAL_ERROR_CODE,
  USER_ERROR_CODE,
} from "@knime/ui-extension-service";

import { getHeadline, getMessage } from "../uiExtensionAlert";

describe("uiExtensionAlert", () => {
  describe("headline", () => {
    it("shows 'Invalid node settings' in case of a node config", () => {
      expect(getHeadline("warning", { nodeId: "1", isNodeConfig: true })).toBe(
        "Invalid node settings",
      );
    });

    it("shows capitalized toast type in case no node name is provided", () => {
      expect(getHeadline("warning", { nodeId: "1" })).toBe("Warning (1)");
    });

    it("shows node name in case it is provided", () => {
      expect(
        getHeadline("warning", { nodeId: "1", nodeName: "NodeName" }),
      ).toBe("NodeName (1)");
    });
  });

  describe("message", () => {
    it("shows user errors", () => {
      expect(
        getMessage({
          type: AlertType.ERROR,
          code: USER_ERROR_CODE,
          message: "An expected error occurred!",
          data: { details: "Some more details: ..." },
        }),
      ).toBe("An expected error occurred!\n\nSome more details: ...");
    });

    it("shows internal errors", () => {
      expect(
        getMessage({
          type: AlertType.ERROR,
          code: INTERNAL_ERROR_CODE,
          message: "An unexpected error occurred!",
          data: {
            stackTrace: ["line1", "line2"],
            typeName: "org.knime.some.ErrorType",
          },
        }),
      ).toBe(
        "An unexpected error occurred!\n\norg.knime.some.ErrorType\n\nline1\n\tline2",
      );
    });

    it("shows other errors", () => {
      expect(
        getMessage({
          type: AlertType.ERROR,
          message: "Invalid parameters",
        }),
      ).toBe("Invalid parameters");
    });
  });
});
