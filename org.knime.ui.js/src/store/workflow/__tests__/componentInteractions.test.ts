import { describe, expect, it, vi, afterEach } from "vitest";
import { createComponentNode, createWorkflow } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { API } from "@api";
import {
  NodeState,
  UpdateLinkedComponentsResult,
} from "@/api/gateway-api/generated-api";

import { loadStore } from "./loadStore";
import { getToastsProvider } from "@/plugins/toasts";

const mockedAPI = deepMocked(API);

describe("workflow::componentInteractions", () => {
  const toast = mockedObject(getToastsProvider());

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should link components", async () => {
    const { store } = await loadStore();
    const dispatchSpy = vi.spyOn(store, "dispatch");
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    await store.dispatch("workflow/linkComponent", { nodeId: "root:2" });
    expect(mockedAPI.desktop.openLinkComponentDialog).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      expect.anything(),
      expect.anything(),
    );

    mockedAPI.desktop.openLinkComponentDialog.mockReturnValueOnce(true);

    await store.dispatch("workflow/linkComponent", { nodeId: "root:2" });
    expect(mockedAPI.desktop.openLinkComponentDialog).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      expect.anything(),
      expect.anything(),
    );
  });

  describe("check for component updates", () => {
    it("should not check for updates if workflow does not contain linked components", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: false } }),
      );

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(
        mockedAPI.workflow.getUpdatableLinkedComponents,
      ).not.toHaveBeenCalled();
      expect(toast.show).not.toHaveBeenCalled();
    });

    it("should not show any toasts if 'auto' is true and there are no updates", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce([]);

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(toast.show).not.toHaveBeenCalled();
    });

    it("should show toast when there are no updates and auto is false", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce([]);

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: false,
      });

      expect(toast.show).toHaveBeenCalledOnce();
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No updates available",
        }),
      );
    });

    it("should show toast when there are updates", async () => {
      const { store } = await loadStore();
      const workflow = createWorkflow({
        info: { containsLinkedComponents: true },
      });
      store.commit("workflow/setActiveWorkflow", workflow);

      const dispatchSpy = vi.spyOn(store, "dispatch");

      const nodeIdAndIsExecuted = [
        { id: "root:1", isExecuted: false },
        { id: "root:2", isExecuted: false },
        { id: "root:3", isExecuted: false },
      ];
      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce(
        nodeIdAndIsExecuted,
      );

      mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
        status: UpdateLinkedComponentsResult.StatusEnum.Success,
      });

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(toast.show).toHaveBeenCalledOnce();
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You have 3 updates available",
          buttons: expect.arrayContaining([
            expect.objectContaining({ text: "Update" }),
          ]),
        }),
      );
      expect(mockedAPI.workflow.getLinkUpdates).toHaveBeenCalledWith({
        projectId: workflow.projectId,
        workflowId: workflow.info.containerId,
      });
      const buttonCallback = toast.show.mock.calls[0][0]!.buttons![0].callback;
      // @ts-expect-error
      await buttonCallback();

      expect(dispatchSpy).toHaveBeenCalledWith(
        "workflow/clearComponentUpdateToasts",
        undefined,
      );
      const nodeIds = nodeIdAndIsExecuted.map((item) => item.id);
      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateComponents", {
        nodeIds,
      });
    });

    it("should show toast when there are updates (executed components)", async () => {
      const { store } = await loadStore();
      const workflow = createWorkflow({
        info: { containsLinkedComponents: true },
        nodes: {
          "root:1": createComponentNode({
            id: "root:1",
            state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
          }),
          "root:2": createComponentNode({
            id: "root:2",
            state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
          }),
          "root:3": createComponentNode({
            id: "root:3",
            state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
          }),
        },
      });
      store.commit("workflow/setActiveWorkflow", workflow);

      const nodeIdAndIsExecuted = [
        { id: "root:1", isExecuted: false },
        { id: "root:2", isExecuted: false },
        { id: "root:3", isExecuted: true },
      ];
      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce(
        nodeIdAndIsExecuted,
      );

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(toast.show).toHaveBeenCalledOnce();
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "You have 3 updates available. Reset components and update now?",
          buttons: expect.arrayContaining([
            expect.objectContaining({ text: "Reset and update" }),
          ]),
        }),
      );
    });

    it("should show toast when there are issues checking for updates", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getLinkUpdates.mockRejectedValue(
        new Error("anything"),
      );

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        silent: false,
      });

      expect(toast.show).toHaveBeenCalledOnce();
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          message: "Problem checking for linked component updates",
        }),
      );
    });

    it("should not show the update check notification for the same project more than once", async () => {
      const { store } = await loadStore();
      const workflow = createWorkflow({
        info: { containsLinkedComponents: true },
      });
      store.commit("workflow/setActiveWorkflow", workflow);

      const nodeIds = ["root:1", "root:2", "root:3"];
      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce(nodeIds);

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(toast.show).toHaveBeenCalledOnce();
      expect(
        mockedAPI.workflow.getUpdatableLinkedComponents,
      ).toHaveBeenCalledWith({
        projectId: workflow.projectId,
        workflowId: workflow.info.containerId,
      });

      // clear mocks before second dispatch
      mockedAPI.workflow.getUpdatableLinkedComponents.mockClear();
      toast.show.mockClear();

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(toast.show).not.toHaveBeenCalled();
      expect(
        mockedAPI.workflow.getUpdatableLinkedComponents,
      ).not.toHaveBeenCalled();

      // clear mocks before third dispatch
      mockedAPI.workflow.getUpdatableLinkedComponents.mockClear();
      toast.show.mockClear();

      // clear state that remembers whether to show/hide notifications
      await store.dispatch("workflow/clearProcessedUpdateNotification", {
        projectId: workflow.projectId,
      });

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        auto: true,
      });

      expect(mockedAPI.workflow.getLinkUpdates).toHaveBeenCalledWith({
        projectId: workflow.projectId,
        workflowId: workflow.info.containerId,
      });
      expect(toast.show).toHaveBeenCalledOnce();
    });
  });

  it("should update components (success)", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
      status: UpdateLinkedComponentsResult.StatusEnum.Success,
    });

    await store.dispatch("workflow/updateComponents", {
      nodeIds: ["root:2", "root:1"],
    });
    expect(toast.show).toHaveBeenCalledTimes(2);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        message: "Updated",
      }),
    );
    expect(
      mockedAPI.workflowCommand.UpdateLinkedComponents,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeIds: ["root:2", "root:1"],
    });
  });

  it("should update components (unchanged)", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
      status: UpdateLinkedComponentsResult.StatusEnum.Unchanged,
    });

    await store.dispatch("workflow/updateComponents", {
      nodeIds: ["root:2", "root:1"],
    });
    expect(toast.show).toHaveBeenCalledTimes(2);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        message: "Everything up-to-date",
      }),
    );
    expect(
      mockedAPI.workflowCommand.UpdateLinkedComponents,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeIds: ["root:2", "root:1"],
    });
  });

  it("should update components (error)", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
      status: UpdateLinkedComponentsResult.StatusEnum.Error,
    });

    await store.dispatch("workflow/updateComponents", {
      nodeIds: ["root:2", "root:1"],
    });
    expect(toast.show).toHaveBeenCalledTimes(2);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Couldn't update linked components. Please try again",
      }),
    );
    expect(
      mockedAPI.workflowCommand.UpdateLinkedComponents,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeIds: ["root:2", "root:1"],
    });
  });

  it("should unlink component", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/unlinkComponent", { nodeId: "root:2" });
    expect(
      mockedAPI.workflowCommand.UpdateComponentLinkInformation,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should change hub item version", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/changeHubItemVersion", { nodeId: "root:2" });
    expect(
      mockedAPI.desktop.openChangeComponentHubItemVersionDialog,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should change component link type", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/changeComponentLinkType", { nodeId: "root:2" });
    expect(
      mockedAPI.desktop.openChangeComponentLinkTypeDialog,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });
});
