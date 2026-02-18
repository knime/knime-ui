import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { componentSearch } from "@/lib/data-mappers";
import { createComponentSearchItem } from "@/test/factories/componentSearch";
import { deepMocked } from "@/test/utils";
import { mountComposable } from "@/test/utils/mountComposable";
import { useComponentSearch } from "../useComponentSearch";

const mockedAPI = deepMocked(API);

vi.mock("@/lib/data-mappers", async () => {
  return {
    ...(await vi.importActual("@/lib/data-mappers")),
    componentSearch: {
      toNodeTemplateWithExtendedPorts: vi.fn((x) => x),
    },
  };
});
vi.mock("@vueuse/core", async () => {
  return {
    ...(await vi.importActual("@vueuse/core")),
    useDebounceFn: vi.fn((fn) => (...args) => fn(...args)),
  };
});

describe("useComponentSearch", () => {
  const doMount = () => {
    const result = mountComposable({
      composable: useComponentSearch,
      composableProps: undefined,
    });

    return { ...result };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads data and does not append", async () => {
    mockedAPI.space.searchComponents.mockResolvedValue([
      createComponentSearchItem({ id: "1" }),
      createComponentSearchItem({ id: "2" }),
      createComponentSearchItem({ id: "3" }),
    ]);

    const { getComposableResult } = doMount();

    const { results, isLoading, hasLoaded, searchComponents } =
      getComposableResult();

    expect(isLoading.value).toBe(false);
    expect(hasLoaded.value).toBe(false);
    expect(results.value.length).toBe(0);

    searchComponents();
    expect(isLoading.value).toBe(true);
    expect(hasLoaded.value).toBe(false);

    await flushPromises();

    expect(results.value.length).toBe(3);
    expect(isLoading.value).toBe(false);
    expect(hasLoaded.value).toBe(true);

    await searchComponents();
    expect(results.value.length).toBe(3);
  });

  it("passes port side and port type to the api", async () => {
    mockedAPI.space.searchComponents.mockResolvedValueOnce([
      createComponentSearchItem({ id: "1" }),
      createComponentSearchItem({ id: "2" }),
      createComponentSearchItem({ id: "3" }),
    ]);

    const { getComposableResult } = doMount();

    const { searchComponents } = getComposableResult();

    await searchComponents({ portSide: "input", portId: "foo" });

    expect(mockedAPI.space.searchComponents).toHaveBeenLastCalledWith({
      query: "",
      offset: 0,
      limit: 150,
      portSide: "input",
      portId: "foo",
    });
  });

  it("appends to loaded data", async () => {
    mockedAPI.space.searchComponents
      .mockResolvedValueOnce([
        createComponentSearchItem({ id: "1" }),
        createComponentSearchItem({ id: "2" }),
        createComponentSearchItem({ id: "3" }),
      ])
      .mockResolvedValueOnce([
        createComponentSearchItem({ id: "4" }),
        createComponentSearchItem({ id: "5" }),
        createComponentSearchItem({ id: "6" }),
      ]);

    const { getComposableResult } = doMount();

    const { results, searchComponents } = getComposableResult();

    await searchComponents();
    expect(mockedAPI.space.searchComponents).toHaveBeenLastCalledWith({
      query: "",
      offset: 0,
      limit: 150,
    });
    expect(results.value.length).toBe(3);
    await searchComponents({ append: true });
    expect(results.value.length).toBe(6);
    expect(mockedAPI.space.searchComponents).toHaveBeenLastCalledWith({
      query: "",
      offset: 150,
      limit: 150,
    });
  });

  it("loads data on query change", async () => {
    mockedAPI.space.searchComponents
      .mockResolvedValueOnce([
        createComponentSearchItem({ id: "1" }),
        createComponentSearchItem({ id: "2" }),
        createComponentSearchItem({ id: "3" }),
      ])
      .mockResolvedValueOnce([
        createComponentSearchItem({ id: "4" }),
        createComponentSearchItem({ id: "5" }),
        createComponentSearchItem({ id: "6" }),
      ]);

    const { getComposableResult } = doMount();

    const {
      results,
      query,
      isLoading,
      hasLoaded,
      updateQuery,
      searchComponents,
    } = getComposableResult();

    // make request first
    await searchComponents();

    updateQuery("foo");
    expect(query.value).toBe("foo");
    expect(isLoading.value).toBe(true);
    expect(hasLoaded.value).toBe(false);

    await flushPromises();
    expect(mockedAPI.space.searchComponents).toHaveBeenLastCalledWith({
      query: "foo",
      offset: 0,
      limit: 150,
    });
    expect(results.value.length).toBe(3);
  });

  it("maps api responses", async () => {
    mockedAPI.space.searchComponents.mockResolvedValueOnce([
      createComponentSearchItem({ id: "1" }),
      createComponentSearchItem({ id: "2" }),
      createComponentSearchItem({ id: "3" }),
    ]);

    const { getComposableResult } = doMount();

    const { searchComponents } = getComposableResult();

    await searchComponents();
    expect(
      componentSearch.toNodeTemplateWithExtendedPorts,
    ).toHaveBeenCalledTimes(3);
  });

  it("cancels requests", async () => {
    mockedAPI.space.searchComponents
      .mockResolvedValueOnce([
        createComponentSearchItem({ id: "1" }),
        createComponentSearchItem({ id: "2" }),
        createComponentSearchItem({ id: "3" }),
      ])
      .mockResolvedValueOnce([
        createComponentSearchItem({ id: "4" }),
        createComponentSearchItem({ id: "5" }),
        createComponentSearchItem({ id: "6" }),
      ]);

    const { getComposableResult } = doMount();

    const { results, searchComponents } = getComposableResult();

    // fake 2 consecutive append requests
    searchComponents({ append: true });
    searchComponents({ append: true });

    await flushPromises();
    expect(results.value.length).toBe(3);
  });

  it("handles error", async () => {
    mockedAPI.space.searchComponents.mockRejectedValueOnce(new Error("boom"));

    const { getComposableResult } = doMount();

    const { isLoading, searchComponents } = getComposableResult();

    await expect(() => searchComponents()).rejects.toThrowError();
    expect(isLoading.value).toBe(false);
  });
});
