/* eslint-disable no-undefined */
import { API } from "@api";
import { defineStore } from "pinia";

import { rfcErrors } from "@knime/hub-features";
import ListIcon from "@knime/styles/img/icons/list-thumbs.svg";
import LoadIcon from "@knime/styles/img/icons/load.svg";

import type { NameCollisionHandling } from "@/api/custom-types.ts";
import {
  type ComponentNode,
  ItemVersion,
  LinkVariant,
  type LinkVariantInfo,
  type NamedItemVersion,
  type ShareComponentResult,
  UpdateLinkedComponentsResult,
} from "@/api/gateway-api/generated-api";
import {
  type DestinationPickerConfig,
  useDestinationPicker,
} from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer.ts";
import { usePromptCollisionStrategies } from "@/composables/confirmDialogs/usePromptCollisionHandling";
import { useChangeHubItemVersionModal } from "@/composables/useChangeHubItemVersionModal";
import { useChangeLinkVariantModal } from "@/composables/useChangeLinkVariantModal";
import { workflowDomain } from "@/lib/workflow-domain";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "@/store/application/application.ts";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations.ts";
import { getToastPresets } from "@/toastPresets";

import { useConnectionInteractionsStore } from "./connectionInteractions";
import { useWorkflowStore } from "./workflow";

const TOAST_HEADLINE = "Component link updated";
const LINK_VARIANT_UPDATED_MESSAGE =
  "The component link type has been updated.";
const ITEM_VERSION_UPDATED_MESSAGE = "Item version updated.";

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

const checkForCollisionsAndLink = async ({
  nodeId,
  destination,
  collisionHandling,
}): Promise<{
  result: ShareComponentResult | undefined;
  collisionHandling: NameCollisionHandling;
}> => {
  const { promptCollisionStrategies } = usePromptCollisionStrategies();

  const { projectId, workflowId } = useWorkflowStore().getProjectAndWorkflowIds;
  const { spaceProviderId, spaceId, itemId } = destination;
  const result = await API.workflowCommand.ShareComponent({
    projectId,
    workflowId,
    nodeId,
    destinationSpaceProviderId: spaceProviderId,
    destinationSpaceId: spaceId,
    destinationItemId: itemId,
    linkVariant: destination.linkVariant,
    includeInputData: destination.includeData || false,
    collisionHandling,
  });

  if (result.isNameCollision) {
    const collisionHandlingChoice = await promptCollisionStrategies();
    if (collisionHandlingChoice === "CANCEL") {
      return {
        result: undefined,
        collisionHandling: collisionHandlingChoice,
      };
    }
    return checkForCollisionsAndLink({
      nodeId,
      destination,
      collisionHandling: collisionHandlingChoice,
    });
  }

  return {
    result,
    collisionHandling,
  };
};

const { toastPresets } = getToastPresets();

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
        const { promptDestination } = useDestinationPicker();

        const applicationStore = useApplicationStore();
        const projectSpaceId = applicationStore.activeProject?.origin?.spaceId;
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        const pickerConfig = {
          title: "Save as shared component",
          description: "Select destination folder for shared component:",
          validate(selection) {
            return selection?.type === "item" && selection.isWorkflowContainer
              ? { valid: true }
              : { valid: false };
          },
          askLinkSettings: { sourceSpaceId: projectSpaceId! },
        } satisfies DestinationPickerConfig;

        const destination = await promptDestination(pickerConfig);
        if (
          !destination ||
          destination.type !== "item" ||
          !destination.linkVariant
        ) {
          return;
        }

        if (!destination.linkVariant) {
          throw new Error("Destination link variant is missing");
        }

        const { result, collisionHandling } = await checkForCollisionsAndLink({
          nodeId,
          destination,
          collisionHandling: null,
        });

        if (!result || !result.uploadedItem || collisionHandling === "CANCEL") {
          return;
        }
        let headline = "Component shared and linked";
        let message =
          "The component has been exported to the destination space and " +
          "the instance in this workflow has been replaced with a link.";
        if (destination.linkVariant?.variant === LinkVariant.VariantEnum.NONE) {
          headline = "Component shared";
          message = "The component has been exported to the destination space.";
        }
        const toastId = $toast.show({
          headline,
          message,
          type: "success",
          buttons: [
            {
              icon: ListIcon,
              text: "Reveal in space explorer",
              callback: () => {
                $toast.remove(toastId);
                useRevealInSpaceExplorer().revealSingleItem(
                  result.uploadedItem!,
                );
              },
            },
          ],
        });

        await useSpaceOperationsStore().fetchWorkflowGroupContent({
          projectId,
        });

        if (collisionHandling === "AUTORENAME") {
          // the name of the component has changed on the remote side
          // (due to the collision handling strategy), which immediately
          // makes a component update available. To avoid this happening at
          // some random time later which might be inconvenient, we do it right away.
          const updateResult = await API.workflowCommand.UpdateLinkedComponents(
            {
              projectId,
              workflowId,
              nodeIds: [nodeId],
            },
          );

          if (
            updateResult.status ===
            UpdateLinkedComponentsResult.StatusEnum.Error
          ) {
            const title =
              "Could not update the component link with the new name.";

            const rfcError = new rfcErrors.RFCError({
              title,
              details: updateResult.details,
            });

            const toastId = $toast.show(
              rfcErrors.toToast({
                headline: TOAST_HEADLINE,
                rfcError,
              }),
            );

            addToastId(workflowId, toastId);
          }
        }
      },

      async unlinkComponent({ nodeId }: { nodeId: string }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        await API.workflowCommand.UpdateComponentLinkInformation({
          projectId,
          workflowId,
          nodeId,
          linkVariant: { variant: LinkVariant.VariantEnum.NONE },
        });
      },

      async changeHubItemVersion({ nodeId }: { nodeId: string }) {
        const workflowStore = useWorkflowStore();
        const node = workflowStore.activeWorkflow?.nodes?.[nodeId];
        if (!node || !workflowDomain.node.isComponent(node)) {
          return;
        }

        const componentNode = node;
        if (
          !componentNode.link ||
          !componentNode.link.isHubItemVersionChangeable
        ) {
          return;
        }

        const { projectId, workflowId } =
          workflowStore.getProjectAndWorkflowIds;

        let itemVersions: NamedItemVersion[];
        try {
          itemVersions = await API.component.getItemVersions({
            projectId,
            workflowId,
            nodeId,
          });
        } catch (error) {
          toastPresets.workflow.component.fetchItemVersionsFailed({ error });
          return;
        }

        const currentItemVersion =
          componentNode.link.targetHubItemVersion ??
          ({
            type: ItemVersion.TypeEnum.CurrentState,
          } satisfies ItemVersion);

        const { promptChangeHubItemVersion } = useChangeHubItemVersionModal();
        const itemVersion = await promptChangeHubItemVersion({
          currentItemVersion,
          itemVersions,
        });

        if (!itemVersion) {
          return;
        }

        try {
          await API.workflowCommand.ChangeComponentLink({
            projectId,
            workflowId,
            nodeId,
            itemVersion,
          });

          $toast.show({
            headline: TOAST_HEADLINE,
            message: ITEM_VERSION_UPDATED_MESSAGE,
            type: "success",
            autoRemove: true,
          });
        } catch (error) {
          toastPresets.workflow.component.updateHubItemVersionFailed({ error });
        }
      },

      async changeComponentLinkVariant({ nodeId }: { nodeId: string }) {
        const workflowStore = useWorkflowStore();
        const node = workflowStore.activeWorkflow?.nodes?.[nodeId];
        if (!node || node.kind !== "component") {
          return;
        }

        const componentNode = node as ComponentNode;
        if (
          !componentNode.link ||
          !componentNode.link.isLinkVariantChangeable
        ) {
          return;
        }

        const { projectId, workflowId } =
          workflowStore.getProjectAndWorkflowIds;

        let linkVariants: LinkVariantInfo[];
        try {
          linkVariants = await API.component.getLinkVariants({
            projectId,
            workflowId,
            nodeId,
          });
        } catch (error) {
          toastPresets.workflow.component.fetchLinkVariantsFailed({ error });
          return;
        }

        if (!linkVariants.length) {
          toastPresets.workflow.component.noLinkVariants();
          return;
        }

        const { promptChangeLinkVariant } = useChangeLinkVariantModal();
        const linkVariant = await promptChangeLinkVariant({
          currentLinkVariant:
            componentNode.link.currentLinkVariant?.variant ?? null,
          linkVariants,
        });

        if (!linkVariant) {
          return;
        }

        try {
          await API.workflowCommand.UpdateComponentLinkInformation({
            projectId,
            workflowId,
            nodeId,
            linkVariant: { variant: linkVariant },
          });

          $toast.show({
            headline: TOAST_HEADLINE,
            message: LINK_VARIANT_UPDATED_MESSAGE,
            type: "success",
            autoRemove: true,
          });
        } catch (error) {
          toastPresets.workflow.component.updateLinkVariantFailed({ error });
        }
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
        } catch (_error) {
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
          const title = `Could not update the linked ${pluralize(
            "component",
            nodeIds.length,
          )}.`;

          const rfcError = new rfcErrors.RFCError({
            title,
            details: result.details,
          });

          const toastId = $toast.show(
            rfcErrors.toToast({
              headline: TOAST_HEADLINE,
              rfcError,
            }),
          );

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

      async cancelOrRetryComponentLoading({
        placeholderId,
        action,
      }: {
        placeholderId: string;
        action: "cancel" | "retry";
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        await API.component.cancelOrRetryComponentLoadJob({
          projectId,
          workflowId,
          placeholderId,
          action,
        });
      },

      async deleteComponentPlaceholder({
        placeholderId,
      }: {
        placeholderId: string;
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        useConnectionInteractionsStore().removeComponentPlaceholderConnection(
          placeholderId,
        );

        await API.workflowCommand.DeleteComponentPlaceholder({
          projectId,
          workflowId,
          placeholderId,
        });
      },
    },
  },
);
