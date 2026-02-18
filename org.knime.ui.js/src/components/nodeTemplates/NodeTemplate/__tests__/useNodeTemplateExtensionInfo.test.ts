import { describe, expect, it } from "vitest";
import { ref } from "vue";

import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { mountComposable } from "@/test/utils/mountComposable";
import { useNodeTemplateExtensionInfo } from "../useNodeTemplateExtensionInfo";

describe("useNodeTemplateExtensionInfo", () => {
  const doMount = (
    templateOverrides: Partial<NodeTemplateWithExtendedPorts> = {},
  ) => {
    const { getComposableResult } = mountComposable({
      composable: useNodeTemplateExtensionInfo,
      composableProps: {
        nodeTemplate: ref(
          createNodeTemplateWithExtendedPorts({ ...templateOverrides }),
        ),
      },
    });

    return { getComposableResult };
  };

  it("returns correct info", () => {
    const { getComposableResult } = doMount({
      extension: { name: "FooExtension", vendor: { name: "SomeVendor" } },
    });

    const { extensionInfo } = getComposableResult();
    expect(extensionInfo.value.tooltip).toMatch(
      "\n———\nFooExtension \nby “SomeVendor”",
    );
    expect(extensionInfo.value.isFromCommunity).toBe(true);
  });

  it("returns correct info for KNIME own extensions", () => {
    const { getComposableResult } = doMount({
      extension: {
        name: "FooExtension",
        vendor: { name: "SomeVendor", isKNIME: true },
      },
    });

    const { extensionInfo } = getComposableResult();
    expect(extensionInfo.value.tooltip).toMatch(
      "\n———\nFooExtension \nby “SomeVendor”",
    );
    expect(extensionInfo.value.isFromCommunity).toBe(false);
  });
});
