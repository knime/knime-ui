import { describe, expect, it } from "vitest";

import type { AvailablePortTypes } from "@/api/custom-types";
import { PortType } from "@/api/gateway-api/generated-api";
import { makeTypeSearch } from "../fuzzyPortTypeSearch";

const createGenericPortSearchResult = (name: string, typeId: string) => ({
  name,
  typeId,
  kind: PortType.KindEnum.Generic,
  description: "No description available",
});

describe("Port Type Search", () => {
  const suggestedTypeIds = ["suggested-1", "suggested-2"];
  const availablePortTypes: AvailablePortTypes = {
    d: { name: "D-Type", kind: PortType.KindEnum.Generic },
    b: { name: "B-Type", kind: PortType.KindEnum.Generic },
    c: { name: "C-Type", kind: PortType.KindEnum.Generic },
    a: { name: "A-Type", kind: PortType.KindEnum.Generic, hidden: true },
    "suggested-1": { name: "Suggested 1", kind: PortType.KindEnum.Generic },
    "suggested-2": { name: "Suggested 2", kind: PortType.KindEnum.Generic },
  };

  const doSearch = (
    query: string,
    { suggestedTypeIds }: { suggestedTypeIds?: string[] } = {
      suggestedTypeIds: [],
    },
  ) =>
    makeTypeSearch({
      typeIds: ["a", "b", "c", "d"],
      showHidden: false,
      availablePortTypes,
      suggestedTypeIds,
    })(query);

  it("should display all port types for an empty search", () => {
    expect(doSearch("").length).toBe(3);
  });

  it("should sort all non-suggested port types alphabetically", () => {
    expect(doSearch("")).toStrictEqual([
      createGenericPortSearchResult("B-Type", "b"),
      createGenericPortSearchResult("C-Type", "c"),
      createGenericPortSearchResult("D-Type", "d"),
    ]);
  });

  it("should search and match entries based on input query", () => {
    expect(doSearch("b")).toStrictEqual([
      createGenericPortSearchResult("B-Type", "b"),
    ]);
  });

  it("should not search hidden ports", () => {
    expect(doSearch("a")).toStrictEqual([]);
  });

  it("should place suggested ports at the top of the search results", () => {
    expect(doSearch("", { suggestedTypeIds })).toStrictEqual([
      createGenericPortSearchResult("Suggested 1", "suggested-1"),
      createGenericPortSearchResult("Suggested 2", "suggested-2"),
      createGenericPortSearchResult("B-Type", "b"),
      createGenericPortSearchResult("C-Type", "c"),
      createGenericPortSearchResult("D-Type", "d"),
    ]);
  });
});
