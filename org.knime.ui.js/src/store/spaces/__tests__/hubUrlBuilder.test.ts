import { describe, expect, it } from "vitest";

import {
  buildHubAppHomeShortLink,
  buildHubRecycleBinUrl,
  buildHubTrashUrl,
} from "../hubUrlBuilder";

describe("spaces::hubUrlBuilder", () => {
  it("builds app-home shortlinks and strips a leading '*' from item ids", () => {
    const result = buildHubAppHomeShortLink({
      providerHostname: "https://api.knime.com/hub",
      itemId: "*workflow-id",
    });

    expect(result).toBe("https://knime.com/hub/a/workflow-id");
  });

  it("builds trash and recycle-bin urls", () => {
    expect(
      buildHubTrashUrl({
        providerHostname: "https://api.knime.com/hub",
        groupName: "acme-team",
      }),
    ).toBe("https://knime.com/hub/acme-team/trash");

    expect(
      buildHubRecycleBinUrl({
        providerHostname: "https://api.knime.com/hub",
        groupName: "acme-team",
      }),
    ).toBe("https://knime.com/hub/acme-team/recycle-bin");
  });

  it("preserves existing path segments from provider hostname", () => {
    expect(
      buildHubAppHomeShortLink({
        providerHostname: "https://api.knime.com/base/path",
        itemId: "workflow-id",
      }),
    ).toBe("https://knime.com/base/path/a/workflow-id");

    expect(
      buildHubTrashUrl({
        providerHostname: "https://api.knime.com/base/path",
        groupName: "acme-team",
      }),
    ).toBe("https://knime.com/base/path/acme-team/trash");
  });

  it("returns null for invalid provider hostnames", () => {
    expect(
      buildHubAppHomeShortLink({
        providerHostname: "not-a-url",
        itemId: "workflow-id",
      }),
    ).toBeNull();

    expect(
      buildHubTrashUrl({
        providerHostname: "not-a-url",
        groupName: "acme-team",
      }),
    ).toBeNull();
  });

  it("returns null when hostname does not use api. prefix", () => {
    expect(
      buildHubAppHomeShortLink({
        providerHostname: "https://knime.com/hub",
        itemId: "workflow-id",
      }),
    ).toBeNull();

    expect(
      buildHubRecycleBinUrl({
        providerHostname: "https://knime.com/hub",
        groupName: "acme-team",
      }),
    ).toBeNull();
  });
});
