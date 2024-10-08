import { describe, expect, it } from "vitest";

import { makeTypeSearch } from "../fuzzyPortTypeSearch";

describe("Port Type Search", () => {
  const suggestedTypeIds = ["suggested-1", "suggested-2"];
  const availablePortTypes = {
    d: { name: "D-Type" },
    b: { name: "B-Type" },
    c: { name: "C-Type" },
    a: { name: "A-Type", hidden: true },
    "suggested-1": { name: "Suggested 1" },
    "suggested-2": { name: "Suggested 2" },
  };

  const doSearch = (query, { suggestedTypeIds } = {}) =>
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
      { name: "B-Type", typeId: "b", description: "No description available" },
      { name: "C-Type", typeId: "c", description: "No description available" },
      { name: "D-Type", typeId: "d", description: "No description available" },
    ]);
  });

  it("shoul search and match entries based on input query", () => {
    expect(doSearch("b")).toStrictEqual([
      { name: "B-Type", typeId: "b", description: "No description available" },
    ]);
  });

  it("should not search hidden ports", () => {
    expect(doSearch("a")).toStrictEqual([]);
  });

  it("should place suggested ports at the top of the search results", () => {
    expect(doSearch("", { suggestedTypeIds })).toStrictEqual([
      {
        name: "Suggested 1",
        typeId: "suggested-1",
        description: "No description available",
      },
      {
        name: "Suggested 2",
        typeId: "suggested-2",
        description: "No description available",
      },
      { name: "B-Type", typeId: "b", description: "No description available" },
      { name: "C-Type", typeId: "c", description: "No description available" },
      { name: "D-Type", typeId: "d", description: "No description available" },
    ]);
  });
});
