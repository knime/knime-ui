<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import OpenInNewWindowIcon from "@knime/styles/img/icons/open-in-new-window.svg";

import type { AvailablePortTypes } from "@/api/custom-types";
import type { ComponentNode } from "@/api/gateway-api/generated-api";
import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";
import { useCompositeViewStore } from "@/store/component/compositeView";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  buildMiddleware,
  validateComponentNotBusyOrReexecuting,
  validateNodeConfigurationState,
} from "../common/output-validator";
import type { UIExtensionLoadingState, ValidationError } from "../common/types";

/**
 * Runs a set of validations that qualify whether a node from a given group is able
 * to show its view
 * @returns object containing an `error` property. If not null then it means the node is invalid. Additionally
 * more details about the error can be read from that `error` object
 */
const runNodeValidationChecks = ({
  selectedNode,
  portTypes,
}: {
  selectedNode: ComponentNode;
  portTypes: AvailablePortTypes;
}) => {
  const validationMiddleware = buildMiddleware(
    validateNodeConfigurationState,
    validateComponentNotBusyOrReexecuting,
  );

  const result = validationMiddleware({
    selectedNode,
    portTypes,
    isReexecuting: useCompositeViewStore().isReexecuting,
  })();
  return Object.freeze(result);
};

type Props = {
  projectId: string;
  workflowId: string;
  selectedNode: ComponentNode;
  availablePortTypes: AvailablePortTypes;
};

const props = defineProps<Props>();

const { isActiveWorkflowFixedVersion } = storeToRefs(useWorkflowStore());
const uiControls = useUIControlsStore();
const pageBuilderHasPage = ref(false);

const emit = defineEmits<{
  loadingStateChange: [value: UIExtensionLoadingState];
  validationError: [value: ValidationError | null];
}>();

const nodeErrors = computed(() => {
  const result = runNodeValidationChecks({
    selectedNode: props.selectedNode,
    portTypes: props.availablePortTypes,
  });

  return result?.error ?? null;
});

watch(
  nodeErrors,
  () => {
    emit("validationError", nodeErrors.value ?? null);
  },
  { immediate: true },
);

const openInNewWindow = () => {
  useExecutionStore().executeNodeAndOpenView(props.selectedNode.id);
};
</script>

<template>
  <div
    v-if="
      !nodeErrors &&
      pageBuilderHasPage &&
      uiControls.canDetachNodeViews &&
      !isActiveWorkflowFixedVersion
    "
    class="detach-button-wrapper"
  >
    <Button
      with-border
      class="detach-view"
      title="Open node view in new window"
      @click="openInNewWindow()"
    >
      <OpenInNewWindowIcon />
      <span>Open in new window</span>
    </Button>
  </div>

  <div v-if="!nodeErrors" class="node-view-wrapper">
    <Suspense>
      <ComponentViewLoader
        :project-id="projectId"
        :workflow-id="workflowId"
        :node-id="selectedNode.id"
        :execution-state="selectedNode.state?.executionState"
        @loading-state-change="emit('loadingStateChange', $event)"
        @pagebuilder-has-page="pageBuilderHasPage = $event"
      />
    </Suspense>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-view-wrapper {
  height: 100%;
}

.detach-button-wrapper {
  display: flex;
  width: max-content;
  height: min-content;
  padding: var(--space-8);
  margin: 0 auto;

  & .detach-view {
    height: 20px;
    padding: 0 10px 0 5px;
    font-size: 13px;
    line-height: 0.1;
    border-color: var(--knime-silver-sand);

    & svg {
      margin-left: 5px;

      @mixin svg-icon-size 12;
    }
  }
}
</style>
