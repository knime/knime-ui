<script setup lang="ts">
import CloseIcon from "@knime/styles/img/icons/cancel-execution.svg?raw";
import ReExecutionIcon from "@knime/styles/img/icons/reexecution.svg?raw";
import TrashIcon from "@knime/styles/img/icons/trash.svg?raw";

import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import * as $shapes from "@/style/shapes";
import { loadSvgInGraphicsContext } from "../../util/loadSvgInGraphicsContext";

import ComponentFloatingButton from "./ComponentFloatingButton.vue";

type Props = {
  id: string;
  isError: boolean;
};

const props = defineProps<Props>();

const { cancelOrRetryComponentLoading, deleteComponentPlaceholder } =
  useComponentInteractionsStore();

const onPointerDown = async () => {
  const action = props.isError ? "retry" : "cancel";

  try {
    await cancelOrRetryComponentLoading({
      placeholderId: props.id,
      action,
    });
  } catch (error) {
    consola.error(`Error while ${action} loading`, error);
  }
};

const onDelete = async () => {
  try {
    await deleteComponentPlaceholder({ placeholderId: props.id });
  } catch (error) {
    consola.error("Error while deleting component placeholder", error);
  }
};
</script>

<template>
  <Container
    label="PlaceholderFloatingOptions"
    :position="{
      x: $shapes.nodeSize / 2,
      y: -($shapes.nodeSize + $shapes.nodeNameMargin),
    }"
  >
    <Container v-if="isError">
      <ComponentFloatingButton
        :icon="loadSvgInGraphicsContext(ReExecutionIcon)"
        :x="-14"
        @pointerdown.self="onPointerDown"
      />
      <ComponentFloatingButton
        :icon="loadSvgInGraphicsContext(TrashIcon)"
        :x="12"
        @pointerdown.self="onDelete"
      />
    </Container>

    <ComponentFloatingButton
      v-else
      :icon="loadSvgInGraphicsContext(CloseIcon)"
      @pointerdown.self="onPointerDown"
    />
  </Container>
</template>
