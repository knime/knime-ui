import { afterEach, describe, expect, it, vi } from "vitest";

import { API } from "@/api";
import { getToastsProvider } from "@/plugins/toasts";
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
      ["executeNodes", "execute"],
      ["cancelNodeExecution", "cancel"],
      ["resetNodes", "reset"],
    ])("passes %s to API", async (fn, action) => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
      });
      store.dispatch(`workflow/${fn}`, ["x", "y"]);

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
      ["pauseLoopExecution", "pause"],
      ["resumeLoopExecution", "resume"],
      ["stepLoopExecution", "step"],
    ])("passes %s to API", async (fn, action) => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
      });

      store.dispatch(`workflow/${fn}`, "node x");

      expect(mockedAPI.node.changeLoopState).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
        action,
        workflowId: "root",
      });
    });

    it("overloaded changeNodeState", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
        nodes: {
          "root:1": { id: "root:1" },
          "root:2": { id: "root:2" },
        },
        workflowAnnotations: [],
      });

      store.dispatch("workflow/changeNodeState", { nodes: "all" });
      expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          projectId: "foo",
          workflowId: "root",
          nodeIds: [],
        }),
      );

      store.dispatch("selection/selectAllObjects");
      store.dispatch("workflow/changeNodeState", { nodes: "selected" });
      expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          nodeIds: ["root:1", "root:2"],
          projectId: "foo",
          workflowId: "root",
        }),
      );

      store.dispatch("workflow/changeNodeState", {
        action: "action",
        nodes: ["root:2"],
      });
      expect(mockedAPI.node.changeNodeStates).toHaveBeenLastCalledWith({
        nodeIds: ["root:2"],
        projectId: "foo",
        workflowId: "root",
        action: "action",
      });
    });

    it("executeNodeAndOpenView", async () => {
      const { store } = await loadStore();

      store.commit("workflow/setActiveWorkflow", { projectId: "foo" });
      store.dispatch("workflow/executeNodeAndOpenView", "root:0");

      expect(mockedAPI.desktop.executeNodeAndOpenView).toHaveBeenCalledWith({
        nodeId: "root:0",
        projectId: "foo",
      });
    });

    describe("openPortView", () => {
      it("open views", async () => {
        const { store } = await loadStore();
        store.commit("workflow/setActiveWorkflow", {
          projectId: "MockProjectId",
        });
        const dispatchSpy = vi.spyOn(store, "dispatch");
        const node = { id: "testnode" };

        await store.dispatch("workflow/openPortView", { node, port: "view" });
        expect(dispatchSpy).toHaveBeenLastCalledWith(
          "workflow/executeNodeAndOpenView",
          node.id,
        );
      });

      it.each(["0", "1", "3"])('openPortView with port="%s"', async (port) => {
        const { store } = await loadStore();
        const dispatchSpy = vi.spyOn(store, "dispatch");
        store.state.application.availablePortTypes = {
          mockType0: { views: [] },
          mockType1: { views: [] },
          mockType2: { views: [] },
          mockType3: { views: [] },
        };
        store.commit("application/setActiveProjectId", "mockActiveProjectId");
        store.commit("workflow/setActiveWorkflow", {
          projectId: "MockProjectId",
        });
        variableMockData.validation.result = {};

        const node = {
          id: "root:0",
          outPorts: [
            { typeId: "mockType0" },
            { typeId: "mockType1" },
            { typeId: "mockType2" },
            { typeId: "mockType3" },
          ],
        };

        // open port with detected view index
        vi.mocked(getPortViewByViewDescriptors).mockReturnValueOnce([
          { id: "42", disabled: false, text: "mock text", canDetach: true },
        ]);
        await store.dispatch("workflow/openPortView", { node, port });
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
        await store.dispatch("workflow/openPortView", { node, port });
        expect(getToastsProvider().show).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: "Port has no detachable view",
            type: "error",
          }),
        );

        // error: no modern viewer
        variableMockData.validation.result =
          variableMockData.validation.UNSUPPORTED_PORT_VIEW;
        await store.dispatch("workflow/openPortView", { node, port });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "workflow/openLegacyPortView",
          {
            nodeId: node.id,
            portIndex: Number(port),
          },
        );

        // error: not executed
        variableMockData.validation.result =
          variableMockData.validation.NODE_UNEXECUTED;
        await store.dispatch("workflow/openPortView", { node, port });
        expect(getToastsProvider().show).toHaveBeenLastCalledWith(
          expect.objectContaining({
            message: "unexecuted error message",
            type: "error",
          }),
        );

        // error: validation failed with another error
        variableMockData.validation.result =
          variableMockData.validation.GENERIC_MOCKERROR;
        await store.dispatch("workflow/openPortView", { node, port });
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
