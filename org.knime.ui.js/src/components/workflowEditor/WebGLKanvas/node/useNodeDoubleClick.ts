import { computed } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";
import { useRouter } from "vue-router";

import { getMetaOrCtrlKey } from "@knime/utils";

import type { KnimeNode } from "@/api/custom-types";
import { Node } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { workflowDomain } from "@/util/workflow-domain";

type UseNodeDoubleClickOptions = {
  node: KnimeNode;
};

export const useNodeDoubleClick = (options: UseNodeDoubleClickOptions) => {
  const $router = useRouter();
  const { useEmbeddedDialogs } = storeToRefs(useApplicationSettingsStore());
  const nodeConfigurationStore = useNodeConfigurationStore();
  const { activeExtensionConfig } = storeToRefs(nodeConfigurationStore);
  const canBeEnlarged = computed(
    () => activeExtensionConfig.value?.canBeEnlarged,
  );
  const { activeProjectId: projectId } = storeToRefs(useApplicationStore());
  const uiControlsStore = useUIControlsStore();

  const onNodeLeftDoubleClick = async (
    event: PointerEvent | FederatedPointerEvent,
  ) => {
    const { node } = options;

    const canOpenAsModal =
      canBeEnlarged.value &&
      useEmbeddedDialogs.value &&
      !workflowDomain.node.isMetaNode(node) &&
      !workflowDomain.node.isComponent(node);

    if (
      workflowDomain.node.isMetaNode(node) ||
      (workflowDomain.node.isComponent(node) && event[getMetaOrCtrlKey()])
    ) {
      if (node.isLocked && uiControlsStore.canLockAndUnlockSubnodes) {
        const isUnlocked = await useComponentInteractionsStore().unlockSubnode({
          nodeId: node.id,
        });

        if (!isUnlocked) {
          return;
        }
      }

      $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: projectId.value, workflowId: node.id },
      });

      return;
    }

    if (!uiControlsStore.canConfigureNodes) {
      return;
    }

    // rare case that the node doesn't have any type of dialog
    if (!node.dialogType) {
      return;
    }

    if (canOpenAsModal) {
      nodeConfigurationStore.setIsLargeMode(true);
    }

    if (
      node.dialogType === Node.DialogTypeEnum.Web &&
      useEmbeddedDialogs.value
    ) {
      return;
    }

    useDesktopInteractionsStore().openNodeConfiguration(node.id);
  };

  return { onNodeLeftDoubleClick };
};
