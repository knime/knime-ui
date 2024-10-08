import { describe, expect, it } from "vitest";

import { SpaceProviderNS } from "@/api/custom-types";
import { createSpaceProvider } from "@/test/factories";
import { formatSpaceProviderName } from "../formatSpaceProviderName";

describe("formatSpaceProviderName", () => {
  it("add a suffix (DEV) for the community hub (dev)", () => {
    const provider = createSpaceProvider({
      id: "community-hub-dev-id",
      name: "KNIME Community Hub",
      type: SpaceProviderNS.TypeEnum.HUB,
      hostname: "http://hubdev.knime.com",
    });

    const formattedName = formatSpaceProviderName(provider);
    expect(formattedName).toBe("KNIME Community Hub (DEV)");
  });
});
