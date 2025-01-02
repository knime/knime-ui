import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { useApplicationStore } from "@/store/application/application";
import {
  NODE_FACTORIES,
  createAvailablePortTypes,
  createNodeTemplate,
  createNodeTemplateWithExtendedPorts,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";
import { useNodeTemplatesStore } from "../nodeTemplates";

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
    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    useApplicationStore(testingPinia).setAvailablePortTypes(availablePortTypes);

    return { nodeTemplatesStore: useNodeTemplatesStore(testingPinia) };
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

      const { nodeTemplatesStore } = loadStore();

      expect(nodeTemplatesStore.cache).toEqual({});

      const result1 = await nodeTemplatesStore.getNodeTemplates({
        nodeTemplateIds,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();

      expect(nodeTemplatesStore.cache).toEqual({
        [nodeTemplate1.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate1),
        [nodeTemplate2.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate2),
        [nodeTemplate3.id]:
          toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate3),
      });

      const result2 = await nodeTemplatesStore.getNodeTemplates({
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

      const { nodeTemplatesStore } = loadStore();

      expect(nodeTemplatesStore.cache).toEqual({});

      const request1 = [nodeTemplate1.id, nodeTemplate2.id];
      const request2 = [nodeTemplate1.id, nodeTemplate2.id, nodeTemplate3.id];

      await nodeTemplatesStore.getNodeTemplates({
        nodeTemplateIds: request1,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledWith({
        nodeTemplateIds: request1,
      });

      await nodeTemplatesStore.getNodeTemplates({
        nodeTemplateIds: request2,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledWith({
        // only the last id, which was not yet cached
        nodeTemplateIds: request2.slice(-1),
      });
    });

    it("should remove duplicate template ids before fetching", async () => {
      const { nodeTemplatesStore } = loadStore();
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

      await nodeTemplatesStore.getNodeTemplates({
        nodeTemplateIds,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledWith({
        nodeTemplateIds: [nodeTemplate1.id, nodeTemplate2.id, nodeTemplate3.id],
      });
    });

    it("should return missing template ids", async () => {
      const { nodeTemplatesStore } = loadStore();

      expect(nodeTemplatesStore.cache).toEqual({});

      const nodeTemplateIds = [
        nodeTemplate1.id,
        nodeTemplate2.id,
        nodeTemplate3.id,
        // non-mocked therefore unknown
        NODE_FACTORIES.GoogleSheetsReaderFactory,
      ];

      const { found, missing } = await nodeTemplatesStore.getNodeTemplates({
        nodeTemplateIds,
      });

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

      const { nodeTemplatesStore } = loadStore();

      expect(nodeTemplatesStore.cache).toEqual({});

      const result = await nodeTemplatesStore.getSingleNodeTemplate({
        nodeTemplateId: nodeTemplate1.id,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();

      expect(result).toEqual(
        toNodeTemplateWithExtendedPorts(availablePortTypes)(nodeTemplate1),
      );

      await nodeTemplatesStore.getSingleNodeTemplate({
        nodeTemplateId: nodeTemplate1.id,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();
    });

    it("should return null when template is missing", async () => {
      mockedAPI.noderepository.getNodeTemplates.mockResolvedValueOnce({});

      const { nodeTemplatesStore } = loadStore();

      expect(nodeTemplatesStore.cache).toEqual({});

      const result = await nodeTemplatesStore.getSingleNodeTemplate({
        nodeTemplateId: nodeTemplate1.id,
      });

      expect(mockedAPI.noderepository.getNodeTemplates).toHaveBeenCalledOnce();

      expect(result).toBeNull();
    });
  });

  it("should update cached templates from search results", async () => {
    mockedAPI.noderepository.getNodeTemplates.mockResolvedValueOnce({
      [nodeTemplate1.id]: nodeTemplate1,
    });

    const { nodeTemplatesStore } = loadStore();

    await nodeTemplatesStore.getSingleNodeTemplate({
      nodeTemplateId: nodeTemplate1.id,
    });

    expect(Object.keys(nodeTemplatesStore.cache)).toEqual([nodeTemplate1.id]);

    const newTemplates = [
      createNodeTemplateWithExtendedPorts({
        id: "some-new-candidate",
      }),
    ];

    nodeTemplatesStore.updateCacheFromSearchResults({
      nodeTemplates: newTemplates,
    });

    expect(Object.keys(nodeTemplatesStore.cache)).toEqual([
      nodeTemplate1.id,
      "some-new-candidate",
    ]);
  });
});
