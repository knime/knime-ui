import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { rfcErrors } from "@knime/hub-features";

import type { NameCollisionHandling } from "@/api/custom-types";
import {
  NodeState,
  ShareComponentCommand,
  UpdateLinkedComponentsResult,
} from "@/api/gateway-api/generated-api";
import type { DestinationPickerResult } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { getToastsProvider } from "@/plugins/toasts";
import { createComponentNode, createWorkflow } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    rfcErrors: {
      // @ts-expect-error
      ...actual.rfcErrors,
      toToast: vi.fn(),
    },
  };
});

vi.mock("@/components/spaces/DestinationPicker/useDestinationPicker", () => {
  return {
    useDestinationPicker: () => ({
      promptDestination: vi.fn().mockResolvedValue({
        type: "item",
        spaceProviderId: "mockDestinationSpaceProviderId",
        spaceId: "mockDestinationSpaceId",
        itemId: "mockDestinationItemId",
        resetWorkflow: false,
        isWorkflowContainer: true,
        linkType: ShareComponentCommand.LinkTypeEnum.MOUNTPOINTABSOLUTE,
        includeData: false,
      } satisfies DestinationPickerResult),
    }),
  };
});

const { usePromptCollisionStrategiesMock } = vi.hoisted(() => ({
  usePromptCollisionStrategiesMock: vi.fn().mockReturnValue({
    promptCollisionStrategies: vi
      .fn()
      .mockResolvedValue("OVERWRITE" as NameCollisionHandling),
  }),
}));

vi.mock("@/composables/useConfirmDialog/usePromptCollisionHandling", () => ({
  usePromptCollisionStrategies: usePromptCollisionStrategiesMock,
}));

describe("workflow::componentInteractions", () => {
  const toast = mockedObject(getToastsProvider());

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should share and link components", async () => {
    const { workflowStore, componentInteractionsStore, spaceOperationsStore } =
      mockStores();

    const fetchWorkflowGroupSpy = vi.spyOn(
      spaceOperationsStore,
      "fetchWorkflowGroupContent",
    );

    workflowStore.setActiveWorkflow(createWorkflow());

    mockedAPI.workflowCommand.ShareComponent.mockResolvedValue({
      isNameCollision: false,
    });

    // the first time issue a name collision
    mockedAPI.workflowCommand.ShareComponent.mockResolvedValueOnce({
      isNameCollision: true,
    });

    await componentInteractionsStore.linkComponent({ nodeId: "root:2" });

    const shareComponentArgs = {
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",

      destinationItemId: "mockDestinationItemId",
      destinationSpaceId: "mockDestinationSpaceId",
      destinationSpaceProviderId: "mockDestinationSpaceProviderId",
      includeInputData: false,
      linkType: "MOUNTPOINT_ABSOLUTE",
    };

    expect(mockedAPI.workflowCommand.ShareComponent).toHaveBeenCalledWith({
      ...shareComponentArgs,
      collisionHandling: null,
    });

    expect(mockedAPI.workflowCommand.ShareComponent).toHaveBeenCalledWith({
      ...shareComponentArgs,
      collisionHandling: "OVERWRITE",
    });

    expect(fetchWorkflowGroupSpy).toHaveBeenCalled();

    expect(toast.show).toHaveBeenCalled();
  });

  describe("check for component updates", () => {
    it("should not check for updates if workflow does not contain linked components", async () => {
      const { workflowStore, componentInteractionsStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({ info: { containsLinkedComponents: false } }),
      );

      await componentInteractionsStore.checkForLinkedComponentUpdates({
        auto: true,
      });

      expect(
        mockedAPI.workflow.getUpdatableLinkedComponents,
      ).not.toHaveBeenCalled();
      expect(toast.show).not.toHaveBeenCalled();
    });

    it("should not show any toasts if 'auto' is true and there are no updates", async () => {
      const { workflowStore, componentInteractionsStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getUpdatableLinkedComponents.mockResolvedValue([]);

      await componentInteractionsStore.checkForLinkedComponentUpdates({
        auto: true,
      });

      expect(toast.show).not.toHaveBeenCalled();
    });

    it("should show toast when there are no updates and auto is false", async () => {
      const { workflowStore, componentInteractionsStore } = mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getUpdatableLinkedComponents.mockResolvedValue([]);

      await componentInteractionsStore.checkForLinkedComponentUpdates({
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
      const { workflowStore, componentInteractionsStore } = mockStores();
      const workflow = createWorkflow({
        info: { containsLinkedComponents: true },
      });

      workflowStore.setActiveWorkflow(workflow);

      const clearToastsSpy = vi.spyOn(
        componentInteractionsStore,
        "clearComponentUpdateToasts",
      );
      const updateComponentsSpy = vi.spyOn(
        componentInteractionsStore,
        "updateComponents",
      );

      const nodeIdAndIsExecuted = [
        { id: "root:1", isExecuted: false },
        { id: "root:2", isExecuted: false },
        { id: "root:3", isExecuted: false },
      ];
      mockedAPI.workflow.getUpdatableLinkedComponents.mockResolvedValue(
        nodeIdAndIsExecuted,
      );

      mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValue({
        status: UpdateLinkedComponentsResult.StatusEnum.Success,
      });

      await componentInteractionsStore.checkForLinkedComponentUpdates({
        auto: true,
      });
      await flushPromises();

      expect(toast.show).toHaveBeenCalledOnce();
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You have 3 updates available",
          buttons: expect.arrayContaining([
            expect.objectContaining({ text: "Update" }),
          ]),
        }),
      );
      expect(
        mockedAPI.workflow.getUpdatableLinkedComponents,
      ).toHaveBeenCalledWith({
        projectId: workflow.projectId,
        workflowId: workflow.info.containerId,
      });
      const buttonCallback = toast.show.mock.calls[0][0]!.buttons![0].callback;
      // @ts-expect-error
      await buttonCallback();

      expect(clearToastsSpy).toHaveBeenCalled();
      const nodeIds = nodeIdAndIsExecuted.map((item) => item.id);
      expect(updateComponentsSpy).toHaveBeenCalledWith({ nodeIds });
    });

    it("should show toast when there are updates (executed components)", async () => {
      const { workflowStore, componentInteractionsStore } = mockStores();
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
      workflowStore.setActiveWorkflow(workflow);

      const nodeIdAndIsExecuted = [
        { id: "root:1", isExecuted: false },
        { id: "root:2", isExecuted: false },
        { id: "root:3", isExecuted: true },
      ];
      mockedAPI.workflow.getUpdatableLinkedComponents.mockResolvedValue(
        nodeIdAndIsExecuted,
      );

      await componentInteractionsStore.checkForLinkedComponentUpdates({
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
      const { workflowStore, componentInteractionsStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({ info: { containsLinkedComponents: true } }),
      );

      mockedAPI.workflow.getUpdatableLinkedComponents.mockRejectedValue(
        new Error("anything"),
      );

      await componentInteractionsStore.checkForLinkedComponentUpdates();

      expect(toast.show).toHaveBeenCalledOnce();
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          message: "Problem checking for linked component updates",
        }),
      );
    });

    it("should not show the update check notification for the same project more than once", async () => {
      const { workflowStore, componentInteractionsStore } = mockStores();
      const workflow = createWorkflow({
        info: { containsLinkedComponents: true },
      });
      workflowStore.setActiveWorkflow(workflow);

      const nodeIds = ["root:1", "root:2", "root:3"];
      mockedAPI.workflow.getUpdatableLinkedComponents.mockResolvedValueOnce(
        nodeIds,
      );

      await componentInteractionsStore.checkForLinkedComponentUpdates({
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

      await componentInteractionsStore.checkForLinkedComponentUpdates({
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
      await componentInteractionsStore.clearProcessedUpdateNotification({
        projectId: workflow.projectId,
      });

      await componentInteractionsStore.checkForLinkedComponentUpdates({
        auto: true,
      });

      expect(
        mockedAPI.workflow.getUpdatableLinkedComponents,
      ).toHaveBeenCalledWith({
        projectId: workflow.projectId,
        workflowId: workflow.info.containerId,
      });
      expect(toast.show).toHaveBeenCalledOnce();
    });
  });

  it("should update components (success)", async () => {
    const { workflowStore, componentInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(createWorkflow());

    mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValue({
      status: UpdateLinkedComponentsResult.StatusEnum.Success,
    });

    await componentInteractionsStore.updateComponents({
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
        message: "Updated.",
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
    const { workflowStore, componentInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(createWorkflow());

    mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
      status: UpdateLinkedComponentsResult.StatusEnum.Unchanged,
    });

    await componentInteractionsStore.updateComponents({
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
        message: "Everything up-to-date.",
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
    const { workflowStore, componentInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(createWorkflow());

    mockedAPI.workflowCommand.UpdateLinkedComponents.mockResolvedValueOnce({
      status: UpdateLinkedComponentsResult.StatusEnum.Error,
    });

    await componentInteractionsStore.updateComponents({
      nodeIds: ["root:2", "root:1"],
    });
    expect(toast.show).toHaveBeenCalledTimes(2);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Updating...",
      }),
    );
    expect(rfcErrors.toToast).toHaveBeenCalled();
    expect(
      mockedAPI.workflowCommand.UpdateLinkedComponents,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeIds: ["root:2", "root:1"],
    });
  });

  it("should unlink component", () => {
    const { workflowStore, componentInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(createWorkflow());

    componentInteractionsStore.unlinkComponent({ nodeId: "root:2" });
    expect(
      mockedAPI.workflowCommand.UpdateComponentLinkInformation,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should change hub item version", () => {
    const { workflowStore, componentInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(createWorkflow());

    componentInteractionsStore.changeHubItemVersion({ nodeId: "root:2" });
    expect(
      mockedAPI.desktop.openChangeComponentHubItemVersionDialog,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should change component link type", () => {
    const { workflowStore, componentInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(createWorkflow());

    componentInteractionsStore.changeComponentLinkType({ nodeId: "root:2" });
    expect(
      mockedAPI.desktop.openChangeComponentLinkTypeDialog,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should cancel or retry component loading", () => {
    const { workflowStore, componentInteractionsStore } = mockStores();

    workflowStore.setActiveWorkflow(createWorkflow());
    componentInteractionsStore.cancelOrRetryComponentLoading({
      placeholderId: "root:2",
      action: "cancel",
    });
    expect(
      mockedAPI.component.cancelOrRetryComponentLoadJob,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      placeholderId: "root:2",
      action: "cancel",
    });
  });
});
