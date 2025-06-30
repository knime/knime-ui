<script setup lang="ts">
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import EditButton from "./EditButton.vue";
import KnimeView from "./KnimeView.vue";
import Row from "./Row.vue";

// TODO: Fix type
interface Props {
  item: {
    type: string;
  };
}

defineProps<Props>();

const handleContentItemDelete = () => {
  console.log("handleContentItemDelete");
};
</script>

<template>
  <div class="item">
    <KnimeView
      v-if="
        item.type === 'view' ||
        item.type === 'nestedLayout' ||
        item.type === 'quickform'
      "
      :view="item"
    />
    <Row v-else-if="item.type === 'row'" :row="item" />
    <div v-else-if="item.type === 'html'">HTML</div>

    <EditButton
      v-if="item.type !== 'row'"
      class="delete-button"
      title="Delete"
      @click.prevent.stop="handleContentItemDelete"
    >
      <TrashIcon />
    </EditButton>

    <!-- TODO: Figure out how to replace popperjs -->
  </div>
</template>

<style lang="postcss" scoped>
.item {
  position: relative; /* needed for handle positioning */
  min-height: 20px;

  &:not(:last-of-type) {
    margin-bottom: 5px;
  }

  & .delete-button {
    border-radius: 0 3px 0 0;
  }
}
</style>
