<script setup lang="ts">
import CloseIcon from "@knime/styles/img/icons/cancel-execution.svg";
import ReExecutionIcon from "@knime/styles/img/icons/reexecution.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import * as $shapes from "@/style/shapes";

import ComponentFloatingButton from "./ComponentFloatingButton.vue";

type Props = {
  id: string;
  isError: boolean;
};

const props = defineProps<Props>();

const { cancelOrRetryComponentLoading, deleteComponentPlaceholder } =
  useComponentInteractionsStore();

const onClick = async () => {
  const action = props.isError ? "retry" : "cancel";

  try {
    await cancelOrRetryComponentLoading({
      placeholderId: props.id,
      action,
    });
  } catch (error) {
    consola.log(`Error while ${action} loading`, error);
  }
};

const onDelete = async () => {
  try {
    await deleteComponentPlaceholder({ placeholderId: props.id });
  } catch (error) {
    consola.log("Error while deleting component placeholder", error);
  }
};
</script>

<template>
  <g
    :transform="`translate(${$shapes.nodeSize / 2}, ${-(
      $shapes.nodeSize + $shapes.nodeNameMargin
    )})`"
  >
    <template v-if="isError">
      <ComponentFloatingButton
        :icon="ReExecutionIcon"
        :x="-13"
        @click.left.stop="onClick"
      />
      <ComponentFloatingButton
        :icon="TrashIcon"
        :x="13"
        @click.left.stop="onDelete"
      />
    </template>

    <template v-else>
      <ComponentFloatingButton :icon="CloseIcon" @click.left.stop="onClick" />
    </template>
  </g>
</template>

<style lang="postcss" scoped></style>
