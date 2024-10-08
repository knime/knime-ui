import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API } from "@/api";
import * as applicationStore from "@/store/application";
import {
  NODE_FACTORIES,
  createAvailablePortTypes,
  createNodeTemplate,
  createNodeTemplateWithExtendedPorts,
} from "@/test/factories";
import { deepMocked, mockVuexStore } from "@/test/utils";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";
import * as nodeTemplatesStore from "../index";

const mockedAPI = deepMocked(API);

describe("nodeTemplates", () => {
  const availablePortTypes = createAvailablePortTypes();

  const nodeTemplate1 = createNodeTemplate({
    id: NODE_FACTORIES.ExcelTableReaderNodeFactory,
  });
  const nodeTemplate2 = createNodeTemplate({
    id: NODE_FACTORIES.CSVTableReaderNodeFactory,
  });
  const nodeTemplate3 = createNodeTemplate({
    id: NODE_FACTORIES.CSVWriter2NodeFactory,
  });

  const nodeTemplatesResponse: Awaited<
    ReturnType<typeof API.noderepository.getNodeTemplates>
  > = {
    [nodeTemplate1.id]: nodeTemplate1,
    [nodeTemplate2.id]: nodeTemplate2,
    [nodeTemplate3.id]: nodeTemplate3,
  };

  const loadStore = () => {
    const $store = mockVuexStore({
      nodeTemplates: nodeTemplatesStore,
      application: applicationStore,
    });

    $store.commit("application/setAvailablePortTypes", availablePortTypes);

    return { $store };
  };

  beforeEach(() => {
    mockedAPI.noderepository.getNodeTemplates.mockResolvedValue(
      nodeTemplatesResponse,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("getNodeTemplates", () => {
    it("should fetch multiple templates and cache them", async () => {
      const nodeTemplateIds = [
        nodeTemplate1.id,
        nodeTemplate2.id,
        nodeTemplate3.id,
      ];

      const { $store } = loadStore();

      expect($store.state.nodeTemplates.cache).toEqual({});

      const result1 = await $store.dispatch("nodeTemplates/getNodeTemplates", {
        nodeTemplateIds,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();

      expect($store.state.nodeTemplates.cache).toEqual({
        [nodeTemplate1.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate1),
        [nodeTemplate2.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate2),
        [nodeTemplate3.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate3),
      });

      const result2 = await $store.dispatch("nodeTemplates/getNodeTemplates", {
        nodeTemplateIds,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();
      expect(result1).toEqual(result2);
      expect(result1.missing).toEqual([]);
    });

    it("should only fetch uncached ids", async () => {
      // prepare mock for 2 separate calls
      mockedAPI.noderepository.getNodeTemplates
        .mockResolvedValueOnce({
          [nodeTemplate1.id]: nodeTemplate1,
          [nodeTemplate2.id]: nodeTemplate2,
        })
        .mockResolvedValueOnce({
          [nodeTemplate3.id]: nodeTemplate3,
        });

      const { $store } = loadStore();

      expect($store.state.nodeTemplates.cache).toEqual({});

      const request1 = [nodeTemplate1.id, nodeTemplate2.id];
      const request2 = [nodeTemplate1.id, nodeTemplate2.id, nodeTemplate3.id];

      await $store.dispatch("nodeTemplates/getNodeTemplates", {
        nodeTemplateIds: request1,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledWith({
        nodeTemplateIds: request1,
      });

      await $store.dispatch("nodeTemplates/getNodeTemplates", {
        nodeTemplateIds: request2,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledWith({
        // only the last id, which was not yet cached
        nodeTemplateIds: request2.slice(-1),
      });
    });

    it("should remove duplicate template ids before fetching", async () => {
      const { $store } = loadStore();
      const nodeTemplateIds = [
        nodeTemplate1.id,
        nodeTemplate1.id,
        nodeTemplate1.id,
        nodeTemplate2.id,
        nodeTemplate2.id,
        nodeTemplate2.id,
        nodeTemplate3.id,
        nodeTemplate3.id,
        nodeTemplate3.id,
      ];

      await $store.dispatch("nodeTemplates/getNodeTemplates", {
        nodeTemplateIds,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledWith({
        nodeTemplateIds: [nodeTemplate1.id, nodeTemplate2.id, nodeTemplate3.id],
      });
    });

    it("should return missing template ids", async () => {
      const { $store } = loadStore();

      expect($store.state.nodeTemplates.cache).toEqual({});

      const nodeTemplateIds = [
        nodeTemplate1.id,
        nodeTemplate2.id,
        nodeTemplate3.id,
        // non-mocked therefore unknown
        NODE_FACTORIES.GoogleSheetsReaderFactory,
      ];

      const { found, missing } = await $store.dispatch(
        "nodeTemplates/getNodeTemplates",
        { nodeTemplateIds },
      );

      expect(found).toEqual({
        [nodeTemplate1.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate1),
        [nodeTemplate2.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate2),
        [nodeTemplate3.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate3),
      });

      expect(missing).toEqual([NODE_FACTORIES.GoogleSheetsReaderFactory]);
    });
  });

  describe("fetchSingleNodeTemplate", () => {
    it("should fetch and cache", async () => {
      mockedAPI.noderepository.getNodeTemplates.mockResolvedValueOnce({
        [nodeTemplate1.id]: nodeTemplate1,
      });

      const { $store } = loadStore();

      expect($store.state.nodeTemplates.cache).toEqual({});

      const result = await $store.dispatch(
        "nodeTemplates/getSingleNodeTemplate",
        { nodeTemplateId: nodeTemplate1.id },
      );

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();

      expect(result).toEqual(
        toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate1),
      );

      await $store.dispatch("nodeTemplates/getSingleNodeTemplate", {
        nodeTemplateId: nodeTemplate1.id,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();
    });

    it("should return empty object when template is missing", async () => {
      mockedAPI.noderepository.getNodeTemplates.mockResolvedValueOnce({});

      const { $store } = loadStore();

      expect($store.state.nodeTemplates.cache).toEqual({});

      const result = await $store.dispatch(
        "nodeTemplates/getSingleNodeTemplate",
        { nodeTemplateId: nodeTemplate1.id },
      );

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();

      expect(result).toEqual({});
    });
  });

  it("should update cached templates from search results", async () => {
    mockedAPI.noderepository.getNodeTemplates.mockResolvedValueOnce({
      [nodeTemplate1.id]: nodeTemplate1,
    });

    const { $store } = loadStore();

    await $store.dispatch("nodeTemplates/getSingleNodeTemplate", {
      nodeTemplateId: nodeTemplate1.id,
    });

    expect(Object.keys($store.state.nodeTemplates.cache)).toEqual([
      nodeTemplate1.id,
    ]);

    const newTemplates = [
      createNodeTemplateWithExtendedPorts({
        id: "some-new-candidate",
      }),
    ];

    $store.dispatch("nodeTemplates/updateCacheFromSearchResults", {
      nodeTemplates: newTemplates,
    });

    expect(Object.keys($store.state.nodeTemplates.cache)).toEqual([
      nodeTemplate1.id,
      "some-new-candidate",
    ]);
  });
});
