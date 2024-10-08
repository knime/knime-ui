import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable max-lines */
import { API } from "@/api";
import { PortType } from "@/api/gateway-api/generated-api";
import {
  NODE_FACTORIES,
  createAvailablePortTypes,
  createComponentNodeDescription,
  createNativeNodeDescription,
} from "@/test/factories";
import { deepMocked, mockVuexStore, withPorts } from "@/test/utils";

const getNodeDescriptionResponse = createNativeNodeDescription();
const getComponentDescriptionResponse = createComponentNodeDescription();

const mockedAPI = deepMocked(API);

describe("nodeDescription", () => {
  const createStore = async () => {
    const availablePortTypes = createAvailablePortTypes({
      "org.knime.core.node.BufferedDataTable": {
        name: "table",
        kind: PortType.KindEnum.Table,
        color: "green",
      },
      "org.some.otherPorType": {
        name: "other",
        kind: PortType.KindEnum.Other,
        color: "blue",
      },
      "org.knime.ext.h2o.ports.H2OFramePortObject": {
        name: "H2O port",
        kind: PortType.KindEnum.Other,
        color: "red",
      },
    });

    const store = mockVuexStore({
      nodeDescription: await import("@/store/nodeDescription"),
      workflow: {
        activeWorkflow: {
          projectId: "project1",
          info: { containerId: "workflow1" },
        },
        getters: {
          projectAndWorkflowIds: () => ({
            projectId: "project1",
            workflowId: "workflow1",
          }),
        },
      },
      application: {
        state: {
          availablePortTypes,
        },
      },
    });

    const dispatchSpy = vi.spyOn(store, "dispatch");

    return {
      dispatchSpy,
      availablePortTypes,
      store,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("nativeNode description", () => {
    beforeEach(() => {
      mockedAPI.node.getNodeDescription.mockReturnValue(
        getNodeDescriptionResponse,
      );
    });

    it("should fetch a description for a native node", async () => {
      const { store, availablePortTypes } = await createStore();
      const params = {
        factoryId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
        nodeFactory: {
          className: "test",
          settings: "test1",
        },
      };

      const result = await store.dispatch(
        "nodeDescription/getNativeNodeDescription",
        params,
      );

      const data = withPorts(
        [getNodeDescriptionResponse],
        availablePortTypes,
      )[0];

      expect(mockedAPI.node.getNodeDescription).toHaveBeenCalled();
      expect(result).toEqual({
        ...data,
        dynInPorts: [
          {
            groupName: "inGroupName",
            groupDescription: "No description available",
            types: [
              expect.objectContaining({
                color: "green",
                kind: "table",
                type: "table",
                description: "No description available",
              }),
            ],
          },
        ],
        dynOutPorts: [
          {
            groupName: "outGroupName",
            groupDescription: "This is the description",
            types: [
              expect.objectContaining({
                color: "green",
                kind: "table",
                type: "table",
                description: "No description available",
              }),
            ],
          },
        ],
      });
    });

    it("should cache node descriptions", async () => {
      const { store } = await createStore();
      const params = {
        factoryId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
        nodeFactory: {
          className: "test",
          settings: "test1",
        },
      };

      await store.dispatch("nodeDescription/getNativeNodeDescription", params);
      await store.dispatch("nodeDescription/getNativeNodeDescription", params);
      await store.dispatch("nodeDescription/getNativeNodeDescription", params);

      expect(mockedAPI.node.getNodeDescription).toHaveBeenCalledOnce();
      expect(store.state.nodeDescription.cache.has(params.factoryId)).toBe(
        true,
      );
    });
  });

  describe("component description", () => {
    beforeEach(() => {
      mockedAPI.node.getComponentDescription.mockReturnValue(
        getComponentDescriptionResponse,
      );
    });

    it("should fetch a description for a component node", async () => {
      const { store } = await createStore();
      const params = { nodeId: "root1:1" };

      const result = await store.dispatch(
        "nodeDescription/getComponentDescription",
        params,
      );

      const inPorts = [
        {
          color: "#FF4B4B",
          description: "No description available",
          kind: "flowVariable",
          name: "Port 1",
          optional: false,
          type: "flowVariable",
          typeId:
            "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          typeName: "Flow Variable",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Flow variables",
              },
              {
                label: "Flow variables",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
        {
          color: "#9B9B9B",
          description: "No description available",
          kind: "generic",
          name: "Port 2",
          optional: false,
          type: "generic",
          typeId: "org.knime.core.node.port.PortObject",
          typeName: "Generic Port",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Table",
              },
              {
                label: "Table",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
      ];

      const outPorts = [
        {
          color: "green",
          description: "No description available",
          kind: "table",
          name: "Port 1",
          optional: false,
          type: "table",
          typeId: "org.knime.core.node.BufferedDataTable",
          typeName: "Table",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Table",
              },
              {
                label: "Table",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
        {
          color: "green",
          description: "No description available",
          kind: "table",
          name: "Port 2",
          optional: false,
          type: "table",
          typeId: "org.knime.core.node.BufferedDataTable",
          typeName: "Table",
          views: {
            descriptorMapping: {
              configured: [0, 2],
              executed: [1, 2],
            },
            descriptors: [
              {
                isSpecView: true,
                label: "Table",
              },
              {
                label: "Table",
              },
              {
                label: "Statistics",
              },
            ],
          },
        },
      ];

      expect(mockedAPI.node.getComponentDescription).toHaveBeenCalled();
      expect(result).toEqual({
        ...result,
        inPorts,
        outPorts,
      });
    });
  });
});
