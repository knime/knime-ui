import { describe, expect, it } from "vitest";

import { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { createSpaceProvider } from "@/test/factories";
import { formatSpaceProviderName } from "../formatSpaceProviderName";

describe("formatSpaceProviderName", () => {
  it("add a suffix (DEV) for the community hub (dev)", () => {
    const provider = createSpaceProvider({
      id: "community-hub-dev-id",
      name: "KNIME Community Hub",
      type: SpaceProviderNS.TypeEnum.HUB,
      hostname: knimeExternalUrls.KNIME_HUB_DEV_HOSTNAME,
    });

    const formattedName = formatSpaceProviderName(provider);
    expect(formattedName).toBe("KNIME Community Hub (DEV)");
  });
});
