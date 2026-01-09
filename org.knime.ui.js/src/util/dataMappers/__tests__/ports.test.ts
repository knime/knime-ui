import { describe, expect, it } from "vitest";

import {
  MetaNodePort,
  NodeState,
  PortType,
} from "@/api/gateway-api/generated-api";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createMetanode,
  createMetanodePort,
  createNativeNode,
  createPort,
  createPortViews,
} from "@/test/factories";
import { ports } from "../ports";

describe("ports data mapper", () => {
  const SPECIAL_PORT_TYPE = "my-special-port-type";
  const availablePortTypes = createAvailablePortTypes({
    [SPECIAL_PORT_TYPE]: {
      kind: PortType.KindEnum.Other,
      name: "My special port type",
    },
  });

  describe("toExtendedPortObject", () => {
    it("maps to extended port from a single typeId string", () => {
      const typeId = PORT_TYPE_IDS.BufferedDataTable;

      const result = ports.toExtendedPortObject(availablePortTypes)(typeId);
      expect(result).toStrictEqual({
        color: "#000000",
        description: "No description available",
        kind: "table",
        name: "Table",
        type: "table",
        typeId: "org.knime.core.node.BufferedDataTable",
        views: {
          descriptorMapping: {
            configured: [0, 2],
            executed: [1, 2],
          },
          descriptors: [
            { isSpecView: true, label: "Table" },
            { label: "Table" },
            { label: "Statistics" },
          ],
        },
      });
    });

    it("maps to extended port from an object containint a typeId string property", () => {
      const typeId = PORT_TYPE_IDS.BufferedDataTable;

      const result = ports.toExtendedPortObject(availablePortTypes)({ typeId });
      expect(result).toStrictEqual({
        color: "#000000",
        description: "No description available",
        kind: "table",
        name: "Table",
        type: "table",
        typeId: "org.knime.core.node.BufferedDataTable",
        views: {
          descriptorMapping: {
            configured: [0, 2],
            executed: [1, 2],
          },
          descriptors: [
            { isSpecView: true, label: "Table" },
            { label: "Table" },
            { label: "Statistics" },
          ],
        },
      });
    });

    it("can exclude the `type` property", () => {
      const typeId = PORT_TYPE_IDS.BufferedDataTable;

      const result = ports.toExtendedPortObject(
        availablePortTypes,
        false,
      )({ typeId });

      expect(result).toStrictEqual({
        color: "#000000",
        description: "No description available",
        kind: "table",
        name: "Table",
        typeId: "org.knime.core.node.BufferedDataTable",
        views: {
          descriptorMapping: {
            configured: [0, 2],
            executed: [1, 2],
          },
          descriptors: [
            { isSpecView: true, label: "Table" },
            { label: "Table" },
            { label: "Statistics" },
          ],
        },
      });
    });
  });

  describe("toRenderablePortViewState", () => {
    it("maps correctly", () => {
      const portViews = createPortViews({
        descriptors: [
          { label: "SpecViewLabel", isSpecView: true },
          { label: "NormalViewLabel" },
          { label: "StatisticsViewLabel" },
        ],
        descriptorMapping: {
          configured: [0, 2],
          executed: [1, 2],
        },
      });

      const configuredNode = createNativeNode({
        state: {
          executionState: NodeState.ExecutionStateEnum.CONFIGURED,
        },
        outPorts: [createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable })],
      });
      const executedNode = createNativeNode({
        state: {
          executionState: NodeState.ExecutionStateEnum.EXECUTED,
        },
        outPorts: [createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable })],
      });

      expect(
        ports.toRenderablePortViewState(portViews, configuredNode, 1),
      ).toEqual([
        { detachable: false, disabled: false, id: "0", text: "SpecViewLabel" },
        {
          detachable: true,
          disabled: true,
          id: "2",
          text: "StatisticsViewLabel",
        },
      ]);
      expect(
        ports.toRenderablePortViewState(portViews, executedNode, 1),
      ).toEqual([
        { detachable: true, disabled: false, id: "1", text: "NormalViewLabel" },
        {
          detachable: true,
          disabled: false,
          id: "2",
          text: "StatisticsViewLabel",
        },
      ]);
    });

    it("gets the correct state for native nodes", () => {
      const port1 = createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable });
      const port2 = createPort({ typeId: SPECIAL_PORT_TYPE });

      const node = createNativeNode({
        outPorts: [port1, port2],
      });

      const { views: portViews1 } = ports.toExtendedPortObject(
        availablePortTypes,
      )(port1.typeId);
      const { views: portViews2 } = ports.toExtendedPortObject(
        availablePortTypes,
      )(port2.typeId);

      const result1 = ports.toRenderablePortViewState(
        portViews1!,
        node,
        port1.index,
      );
      const result2 = ports.toRenderablePortViewState(
        portViews2!,
        node,
        port2.index,
      );

      expect(result1).toEqual([
        { detachable: false, disabled: false, id: "0", text: "Table" },
        { detachable: true, disabled: true, id: "2", text: "Statistics" },
      ]);
      expect(result2).toEqual([]);
    });

    it("gets the correct state for metanodes", () => {
      const port1 = createMetanodePort({
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,
      });
      const metanode = createMetanode({
        outPorts: [port1],
      });

      const { views: portViews } = ports.toExtendedPortObject(
        availablePortTypes,
      )(PORT_TYPE_IDS.BufferedDataTable);

      const result1 = ports.toRenderablePortViewState(
        portViews!,
        metanode,
        port1.index,
      );
      expect(result1).toEqual([
        { detachable: false, disabled: false, id: "0", text: "Table" },
        { detachable: true, disabled: true, id: "2", text: "Statistics" },
      ]);
    });
  });
});
