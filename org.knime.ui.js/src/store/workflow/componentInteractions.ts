import { API } from "@api";
import { defineStore } from "pinia";

import LoadIcon from "@knime/styles/img/icons/load.svg";

import { UpdateLinkedComponentsResult } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { showProblemDetailsErrorToast } from "@/util/showProblemDetailsErrorToast";

import { useWorkflowStore } from "./workflow";

const TOAST_HEADLINE = "Linked components";

const $toast = getToastsProvider();

const toastIdsByWorkflowId: Map<string, Set<string>> = new Map<
  string,
  Set<string>
>();

const addToastId = (workflowId: string, toastId: string) => {
  if (toastIdsByWorkflowId[workflowId]) {
    toastIdsByWorkflowId[workflowId].add(toastId);
  } else {
    toastIdsByWorkflowId[workflowId] = new Set(toastId);
  }
};

const pluralize = (text: string, count: number) =>
  count > 1 ? `${text}s` : text;

type ComponentInteractionsState = {
  processedUpdateNotifications: Record<string, boolean>;
};

export const useComponentInteractionsStore = defineStore(
  "componentInteractions",
  {
    state: (): ComponentInteractionsState => ({
      processedUpdateNotifications: {},
    }),
    actions: {
      setProcessedNotification({
        projectId,
        value,
      }: {
        projectId: string;
        value: boolean;
      }) {
        this.processedUpdateNotifications[projectId] = value;
      },

      async linkComponent({ nodeId }: { nodeId: string }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        const success = await API.desktop.openLinkComponentDialog({
          projectId,
          workflowId,
          nodeId,
        });
        if (success) {
          // Reload the space items if the component linking was successful
          await useSpaceOperationsStore().fetchWorkflowGroupContent({
            projectId,
          });
        }
      },

      async unlinkComponent({ nodeId }: { nodeId: string }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        await API.workflowCommand.UpdateComponentLinkInformation({
          projectId,
          workflowId,
          nodeId,
        });
      },

      changeHubItemVersion({ nodeId }: { nodeId: string }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        API.desktop.openChangeComponentHubItemVersionDialog({
          projectId,
          workflowId,
          nodeId,
        });
      },

      changeComponentLinkType({ nodeId }: { nodeId: string }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        API.desktop.openChangeComponentLinkTypeDialog({
          projectId,
          workflowId,
          nodeId,
        });
      },

      clearComponentUpdateToasts() {
        const { workflowId } = useWorkflowStore().getProjectAndWorkflowIds;
        const $toast = getToastsProvider();
        const toastIdsToBeRemoved = toastIdsByWorkflowId[workflowId];
        if (toastIdsToBeRemoved) {
          toastIdsToBeRemoved.forEach((toastId: string) => {
            $toast.remove(toastId);
          });
          toastIdsByWorkflowId.delete(workflowId);
        }
      },

      clearProcessedUpdateNotification({ projectId }: { projectId: string }) {
        this.setProcessedNotification({ projectId, value: false });
      },

      lockSubnode({ nodeId }: { nodeId: string }) {
        const { projectId } = useWorkflowStore().getProjectAndWorkflowIds;
        API.desktop.openLockSubnodeDialog({ projectId, nodeId });
      },

      unlockSubnode({ nodeId }: { nodeId: string }) {
        const { projectId } = useWorkflowStore().getProjectAndWorkflowIds;
        return API.desktop.unlockSubnode({ projectId, nodeId });
      },

      async checkForLinkedComponentUpdates({ auto = false } = {}) {
        const workflowStore = useWorkflowStore();
        const isWritable = workflowStore.isWritable;
        const shouldCheckForUpdates =
          isWritable &&
          workflowStore.activeWorkflow!.info.containsLinkedComponents;

        const { projectId, workflowId } =
          workflowStore.getProjectAndWorkflowIds;
        const hasAlreadyChecked = this.processedUpdateNotifications[projectId];

        if (!shouldCheckForUpdates || (hasAlreadyChecked && auto)) {
          return;
        }

        try {
          const updatables = await API.workflow.getUpdatableLinkedComponents({
            projectId,
            workflowId,
          });

          if (updatables.length === 0) {
            if (!auto) {
              $toast.show({
                type: "success",
                headline: TOAST_HEADLINE,
                message: "No updates available",
              });
            }
            return;
          }

          const hasExecutedNodes = updatables.some(
            (updatable) => updatable.isExecuted,
          );
          const nodeIds = updatables.map((updatable) => updatable.id);

          const message = `You have ${nodeIds.length} ${pluralize(
            "update",
            nodeIds.length,
          )} available`;

          const withUpdateDisclaimer = hasExecutedNodes
            ? `${message}. Reset ${pluralize(
                "component",
                nodeIds.length,
              )} and update now?`
            : message;

          const toastId = $toast.show({
            type: "warning",
            headline: TOAST_HEADLINE,
            message: withUpdateDisclaimer,
            buttons: [
              {
                icon: LoadIcon,
                text: hasExecutedNodes ? "Reset and update" : "Update",
                callback: async () => {
                  this.clearComponentUpdateToasts();
                  await this.updateComponents({ nodeIds });
                },
              },
            ],
            autoRemove: false,
          });
          addToastId(workflowId, toastId);
          this.setProcessedNotification({ projectId, value: true });
        } catch (error) {
          const toastId = $toast.show({
            type: "error",
            headline: TOAST_HEADLINE,
            message: "Problem checking for linked component updates",
            autoRemove: false,
          });
          addToastId(workflowId, toastId);
        }
      },

      async updateComponents({ nodeIds }: { nodeIds: string[] }) {
        const updateStartedToastId = $toast.show({
          headline: TOAST_HEADLINE,
          message: "Updating...",
          autoRemove: false,
        });

        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        addToastId(workflowId, updateStartedToastId);
        const result = await API.workflowCommand.UpdateLinkedComponents({
          projectId,
          workflowId,
          nodeIds,
        });

        $toast.remove(updateStartedToastId);

        if (result.status === UpdateLinkedComponentsResult.StatusEnum.Error) {
          const toastId = showProblemDetailsErrorToast({
            headline: TOAST_HEADLINE,
            problemDetails: {
              title: `Could not update the linked ${pluralize(
                "component",
                nodeIds.length,
              )}. Try again later.`,
              details: result.details,
            },
          });
          addToastId(workflowId, toastId);
        } else {
          const message =
            result.status === UpdateLinkedComponentsResult.StatusEnum.Success
              ? "Updated."
              : "Everything up-to-date.";
          $toast.show({
            headline: TOAST_HEADLINE,
            message,
            type: "success",
            autoRemove: true,
          });
        }
      },
    },
  },
);
