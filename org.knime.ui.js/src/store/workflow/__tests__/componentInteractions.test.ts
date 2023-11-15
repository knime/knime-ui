import {
  describe,
  expect,
  it,
  vi,
  afterEach,
  type Mock,
  beforeEach,
} from "vitest";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { API } from "@api";

import { loadStore } from "./loadStore";
import { UpdateLinkedComponentsResult } from "@/api/gateway-api/generated-api";

const mockedAPI = deepMocked(API);

const show: Mock = vi.fn();
const remove: Mock = vi.fn();
const removeBy: Mock = vi.fn();

vi.mock("@/plugins/toasts", () => ({
  getToastsProvider: () => {
    return { show, remove, removeBy };
  },
}));

describe("workflow::componentInteractions", () => {
  beforeEach(() => {
    show.mockClear();
    remove.mockClear();
    removeBy.mockClear();
  });

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
    it("should not check for updates if there are none", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: false } }),
      );

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        silent: true,
      });

      expect(mockedAPI.workflow.getLinkUpdates).not.toHaveBeenCalled();
      expect(show).not.toHaveBeenCalled();
    });

    it("should not show any toasts if 'silent' is set as a param and there are no updates", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce([]);

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        silent: true,
      });

      expect(show).not.toHaveBeenCalled();
    });

    it("should show toast when there are no updates and silent is false", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce([]);

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        silent: false,
      });

      expect(show).toHaveBeenCalledOnce();
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No updates available",
        }),
      );
    });

    it("should show toast when there are updates", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      const dispatchSpy = vi.spyOn(store, "dispatch");

      const nodeIds = ["root:1", "root:2", "root:3"];
      mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce(nodeIds);

      mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
        status: UpdateLinkedComponentsResult.StatusEnum.Success,
      });

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        silent: false,
      });

      expect(show).toHaveBeenCalledOnce();
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You have 3 updates available",
          buttons: expect.any(Array),
        }),
      );
      const buttonCallback = show.mock.calls[0][0].buttons[0].callback;
      await buttonCallback();
      expect(dispatchSpy).toHaveBeenCalledWith(
        "workflow/clearComponentUpdateToasts",
        undefined,
      );
      expect(dispatchSpy).toHaveBeenCalledWith("workflow/updateComponents", {
        nodeIds,
      });
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
      // mockedAPI.workflow.getLinkUpdates.mockResolvedValueOnce([]);

      await store.dispatch("workflow/checkForLinkedComponentUpdates", {
        silent: false,
      });

      expect(show).toHaveBeenCalledOnce();
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          message: "Problem checking for linked component updates",
        }),
      );
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
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(show).toHaveBeenCalledWith(
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
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(show).toHaveBeenCalledWith(
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
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(show).toHaveBeenCalledWith(
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
