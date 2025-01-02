import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { getToastsProvider } from "@/plugins/toasts";
import {
  createAvailablePortTypes,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { getPortViewByViewDescriptors } from "@/util/getPortViewByViewDescriptors";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);
const variableMockData = vi.hoisted(() => ({
  validation: {
    UNSUPPORTED_PORT_VIEW: {
      error: {
        code: "UNSUPPORTED_PORT_VIEW",
        message: "unsupported error message",
      },
    },
    NODE_UNEXECUTED: {
      error: {
        code: "NODE_UNEXECUTED",
        message: "unexecuted error message",
      },
    },
    GENERIC_MOCKERROR: {
      error: {
        message: "generic error message",
      },
    },
    result: {},
  },
}));
vi.mock(
  "@/components/uiExtensions/common/output-validator",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/uiExtensions/common/output-validator")
    >()),
    buildMiddleware: () => () => () => variableMockData.validation.result,
  }),
);
vi.mock("@/plugins/toasts", async (importOriginal) => {
  const mockShow = vi.fn();
  return {
    ...(await importOriginal<typeof import("@/plugins/toasts")>()),
    getToastsProvider: () => ({
      show: mockShow,
    }),
  };
});

vi.mock("@/util/getPortViewByViewDescriptors", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/util/getPortViewByViewDescriptors")
  >();
  const getPortViewByViewDescriptors = vi
    .fn()
    .mockImplementation(original.getPortViewByViewDescriptors);
  return {
    ...original,
    getPortViewByViewDescriptors,
  };
});

describe("workflow store: Execution", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("actions", () => {
    it.each([
      ["executeNodes", "execute"] as const,
      ["cancelNodeExecution", "cancel"] as const,
      ["resetNodes", "reset"] as const,
    ])("passes %s to API", (fn, action) => {
      const { workflowStore, executionStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      executionStore[fn](["x", "y"]);

      expect(mockedAPI.node.changeNodeStates).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeIds: ["x", "y"],
          projectId: "foo",
          action,
          workflowId: "root",
        }),
      );
    });

    it.each([
      ["pauseLoopExecution", "pause"] as const,
      ["resumeLoopExecution", "resume"] as const,
      ["stepLoopExecution", "step"] as const,
    ])("passes %s to API", (fn, action) => {
      const { workflowStore, executionStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      executionStore[fn]("node x");

      expect(mockedAPI.node.changeLoopState).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
        action,
        workflowId: "root",
      });
    });

    it("overloaded changeNodeState", () => {
      const { workflowStore, executionStore, selectionStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
          nodes: {
            "root:1": { id: "root:1" },
            "root:2": { id: "root:2" },
          },
          workflowAnnotations: [],
        }),
      );

      executionStore.changeNodeState({ action: "execute", nodes: "all" });
      expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          projectId: "foo",
          workflowId: "root",
          nodeIds: [],
          action: "execute",
        }),
      );

      selectionStore.selectAllObjects();
      executionStore.changeNodeState({ action: "execute", nodes: "selected" });

      expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          nodeIds: ["root:1", "root:2"],
          projectId: "foo",
          workflowId: "root",
          action: "execute",
        }),
      );

      executionStore.changeNodeState({ action: "execute", nodes: ["root:2"] });

      expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith({
        nodeIds: ["root:2"],
        projectId: "foo",
        workflowId: "root",
        action: "execute",
      });
    });

    it("executeNodeAndOpenView", () => {
      const { workflowStore, executionStore } = loadStore();

      workflowStore.setActiveWorkflow(createWorkflow({ projectId: "foo" }));
      executionStore.executeNodeAndOpenView("root:0");

      expect(mockedAPI.desktop.executeNodeAndOpenView).toHaveBeenCalledWith({
        nodeId: "root:0",
        projectId: "foo",
      });
    });

    describe("openPortView", () => {
      it("open views", () => {
        const { workflowStore, executionStore } = loadStore();
        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "MockProjectId",
          }),
        );

        const node = createNativeNode({ id: "testnode" });

        executionStore.openPortView({ node, port: "view" });
        expect(executionStore.executeNodeAndOpenView).toHaveBeenLastCalledWith(
          node.id,
        );
      });

      it.each(["0", "1", "3"])('openPortView with port="%s"', async (port) => {
        const { workflowStore, executionStore, applicationStore } = loadStore();

        applicationStore.availablePortTypes = createAvailablePortTypes({
          // @ts-ignore
          mockType0: { views: {} },
          // @ts-ignore
          mockType1: { views: {} },
          // @ts-ignore
          mockType2: { views: {} },
          // @ts-ignore
          mockType3: { views: {} },
        });

        applicationStore.setActiveProjectId("mockActiveProjectId");
        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "MockProjectId",
          }),
        );
        variableMockData.validation.result = {};

        const node = createNativeNode({
          id: "root:0",
          outPorts: [
            { typeId: "mockType0" },
            { typeId: "mockType1" },
            { typeId: "mockType2" },
            { typeId: "mockType3" },
          ],
        });

        // open port with detected view index
        vi.mocked(getPortViewByViewDescriptors).mockReturnValueOnce([
          { id: "42", disabled: false, text: "mock text", canDetach: true },
        ]);

        executionStore.openPortView({ node, port });
        expect(mockedAPI.desktop.openPortView).toHaveBeenCalledOnce();
        expect(mockedAPI.desktop.openPortView).toHaveBeenCalledWith({
          projectId: "mockActiveProjectId",
          nodeId: node.id,
          viewIndex: 42,
          portIndex: Number(port),
        });

        // error: no view for port
        vi.mocked(getPortViewByViewDescriptors).mockReturnValueOnce([
          { id: "1", disabled: false, text: "mock text", canDetach: false },
        ]);
        executionStore.openPortView({ node, port });
        expect(getToastsProvider().show).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: "Port has no detachable view",
            type: "error",
          }),
        );

        // error: no modern viewer
        variableMockData.validation.result =
          variableMockData.validation.UNSUPPORTED_PORT_VIEW;
        executionStore.openPortView({ node, port });
        expect(executionStore.openLegacyPortView).toHaveBeenCalledWith({
          nodeId: node.id,
          portIndex: Number(port),
        });

        // error: not executed
        variableMockData.validation.result =
          variableMockData.validation.NODE_UNEXECUTED;
        executionStore.openPortView({ node, port });
        expect(getToastsProvider().show).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: "unexecuted error message",
            type: "error",
          }),
        );

        // error: validation failed with another error
        variableMockData.validation.result =
          variableMockData.validation.GENERIC_MOCKERROR;
        await executionStore.openPortView({ node, port });
        expect(getToastsProvider().show).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: "generic error message",
            type: "error",
          }),
        );
      });
    });
  });
});
