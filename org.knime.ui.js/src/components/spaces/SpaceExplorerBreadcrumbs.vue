<script setup lang="ts">
import type { WorkflowGroupContent } from "@/api/gateway-api/generated-api";
import { computed } from "vue";

import HouseIcon from "webapps-common/ui/assets/img/icons/house.svg";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";

interface Props {
  activeWorkflowGroup: WorkflowGroupContent | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "click", id: string): void;
}>();

const breadcrumbItems = computed(() => {
  const homeBreadcrumbItem = {
    icon: HouseIcon,
    id: "root",
  };

  if (!props.activeWorkflowGroup) {
    return [
      {
        ...homeBreadcrumbItem,
        text: "Home",
        clickable: false,
      },
    ];
  }

  const { path } = props.activeWorkflowGroup;
  const rootBreadcrumb = {
    ...homeBreadcrumbItem,
    text: path.length === 0 ? "Home" : null,
    clickable: path.length > 0,
  };
  const lastPathIndex = path.length - 1;

  return [rootBreadcrumb].concat(
    path.map((pathItem, index) => ({
      icon: null,
      text: pathItem.name,
      id: pathItem.id,
      clickable: index !== lastPathIndex,
    })),
  );
});

const onBreadcrumbClick = ({ id }) => {
  emit("click", id);
};
</script>

<template>
  <div class="breadcrumb-wrapper">
    <Breadcrumb :items="breadcrumbItems" @click-item="onBreadcrumbClick" />
  </div>
</template>

<style lang="postcss" scoped>
.breadcrumb-wrapper {
  padding: 0 var(--space-both-sides, 0);
  position: relative;
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;

  & .breadcrumb {
    padding-bottom: 0;
    overflow-x: auto;
    white-space: pre;
    -ms-overflow-style: none; /* needed to hide scroll bar in edge */
    scrollbar-width: none; /* for firefox */
    user-select: none;
    margin-right: 8px;

    &::-webkit-scrollbar {
      display: none;
    }

    & :deep(.arrow) {
      margin: 0;
    }

    & :deep(ul > li > span) {
      color: var(--knime-dove-gray);

      &:last-child,
      &:hover {
        color: var(--knime-masala);
      }
    }
  }
}
</style>
