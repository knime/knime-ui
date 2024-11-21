<script setup lang="ts">
import { computed } from "vue";

import { Breadcrumb, type BreadcrumbItem } from "@knime/components";
import HouseIcon from "@knime/styles/img/icons/house.svg";

import type { WorkflowGroupContent } from "@/api/gateway-api/generated-api";

interface Props {
  activeWorkflowGroup: WorkflowGroupContent | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [id: string];
}>();

const breadcrumbItems = computed<Array<BreadcrumbItem>>(() => {
  const homeBreadcrumbItem = {
    icon: HouseIcon,
    id: "root",
    title: "Home",
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
  const rootBreadcrumb: BreadcrumbItem = {
    ...homeBreadcrumbItem,
    // eslint-disable-next-line no-undefined
    text: path.length === 0 ? "Home" : undefined,
    clickable: path.length > 0,
  };
  const lastPathIndex = path.length - 1;

  return [rootBreadcrumb].concat(
    path.map((pathItem, index) => ({
      icon: null,
      text: pathItem.name,
      id: pathItem.id,
      clickable: index !== lastPathIndex,
      title: pathItem.name,
    })),
  );
});

const onBreadcrumbClick = ({ id }: BreadcrumbItem) => {
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

    & :deep(ul > li:not(:last-child) > span) {
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
