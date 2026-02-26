import { beforeAll, describe, expect, it, vi } from "vitest";

import { isBrowser, isDesktop, runInEnvironment } from "@/environment";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { webResourceLocation } from "../index";

vi.mock("@/environment");

describe("webResourceLocation", () => {
  beforeAll(() => {
    webResourceLocation.setContext({
      jobId: "job123",
      restAPIBaseURL: "http://example.com",
    });

    import.meta.env.DEV = false;
  });

  const setupEnvironmentMock = (env: "DESKTOP" | "BROWSER") => {
    mockEnvironment(env, { isBrowser, isDesktop });
    vi.mocked(runInEnvironment).mockImplementation(
      (matcher) => matcher[env]?.(),
    );
  };

  describe("uiExtensionResource", () => {
    it("[DESKTOP] returns the correct value", () => {
      setupEnvironmentMock("DESKTOP");
      expect(webResourceLocation.uiExtensionResource("path", "base/")).toBe(
        "base/path",
      );
    });

    it("[BROWSER] returns the correct value", () => {
      setupEnvironmentMock("BROWSER");
      expect(webResourceLocation.uiExtensionResource("path")).toBe(
        "http://example.com/jobs/job123/workflow/wizard/web-resources/path",
      );
    });
  });

  describe("nodeOutputResource", () => {
    it("[BROWSER] returns the correct value", () => {
      setupEnvironmentMock("BROWSER");
      expect(webResourceLocation.nodeOutputResource("something")).toBe(
        "http://example.com/jobs/job123/output-resources/something",
      );
    });

    it("should URL encode special characters in resource path", () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });

      expect(
        webResourceLocation.nodeOutputResource("resource with spaces"),
      ).toBe(
        "http://example.com/jobs/job123/output-resources/resource%20with%20spaces",
      );
    });
  });

  describe("hintAsset", () => {
    it("[DESKTOP] is not supported", () => {
      setupEnvironmentMock("DESKTOP");
      expect(() => webResourceLocation.hintAsset("image.png")).toThrow();
    });

    it("[BROWSER] returns the correct value", () => {
      setupEnvironmentMock("BROWSER");
      expect(webResourceLocation.hintAsset("image.png")).toBe(
        "http://example.com/jobs/job123/workflow/wizard/web-resources/org/knime/ui/js/image.png",
      );
    });
  });
});
