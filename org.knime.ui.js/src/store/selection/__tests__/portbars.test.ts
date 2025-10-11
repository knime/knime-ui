import { describe, expect, it } from "vitest";

import { mockStores } from "@/test/utils/mockStores";

describe("selection::portbars", () => {
  it("selects/deselects", () => {
    const { selectionStore } = mockStores();

    expect(selectionStore.getSelectedMetanodePortBars).toEqual([]);

    selectionStore.selectMetanodePortBar("in");
    expect(selectionStore.getSelectedMetanodePortBars).toEqual(["in"]);
    selectionStore.selectMetanodePortBar("out");
    expect(selectionStore.getSelectedMetanodePortBars).toEqual(["in", "out"]);
    expect(selectionStore.isMetaNodePortBarSelected("in")).toBe(true);

    selectionStore.deselectMetanodePortBar("in");
    expect(selectionStore.isMetaNodePortBarSelected("in")).toBe(false);
    expect(selectionStore.getSelectedMetanodePortBars).toEqual(["out"]);
    expect(selectionStore.isMetaNodePortBarSelected("out")).toBe(true);
  });
});
