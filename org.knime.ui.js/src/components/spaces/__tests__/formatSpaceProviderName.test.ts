import { SpaceProviderNS } from "@/api/custom-types";
import { createSpaceProvider } from "@/test/factories";
import { describe, expect, it } from "vitest";
import { formatSpaceProviderName } from "../formatSpaceProviderName";
import { COMMUNITY_HUB_ID } from "@/store/spaces/util";

describe("formatSpaceProviderName", () => {
  it("removes url for hub providers", () => {
    const provider = createSpaceProvider({
      id: "some-provider",
      name: "some provider name (http://some.provider.name)",
      type: SpaceProviderNS.TypeEnum.HUB,
    });

    const formattedName = formatSpaceProviderName(provider);
    expect(formattedName).toBe("some provider name");
  });

  it("replaces community hub (prod) name", () => {
    const provider = createSpaceProvider({
      id: COMMUNITY_HUB_ID,
      name: "This is the community hub, but the name doesn't matter (http://community.hub.knime.url)",
      type: SpaceProviderNS.TypeEnum.HUB,
    });

    const formattedName = formatSpaceProviderName(provider);
    expect(formattedName).toBe("KNIME Community Hub");
  });

  it("replaces community hub (dev) name", () => {
    const provider = createSpaceProvider({
      id: "community-hub-dev-id",
      name: "This is the community hub dev, but the name doesn't matter (http://hubdev.knime.com)",
      type: SpaceProviderNS.TypeEnum.HUB,
    });

    const formattedName = formatSpaceProviderName(provider);
    expect(formattedName).toBe("KNIME Community Hub (DEV)");
  });
});
