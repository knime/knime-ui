<script setup lang="ts">
import { computed } from "vue";

import { Breadcrumb, type BreadcrumbItem } from "@knime/components";
import CubeIcon from "@knime/styles/img/icons/cube.svg";

import type { SpaceProviderNS } from "@/api/custom-types";
import type { WorkflowGroupContent } from "@/api/gateway-api/generated-api";
import { isHubProvider } from "@/store/spaces/util";

import { useSpaceIcons } from "./useSpaceIcons";

interface Props {
  activeWorkflowGroup: WorkflowGroupContent | null;
  space?: SpaceProviderNS.Space;
  spaceProvider?: SpaceProviderNS.SpaceProvider;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [id: string];
}>();

const { getSpaceIcon, getSpaceProviderIcon } = useSpaceIcons();

const rootIcon = computed(() => {
  if (!props.spaceProvider) {
    return CubeIcon;
  }
  if (isHubProvider(props.spaceProvider)) {
    return getSpaceIcon(props.space);
  }
  return getSpaceProviderIcon(props.spaceProvider);
});

const breadcrumbItems = computed<Array<BreadcrumbItem>>(() => {
  const rootBreadcrumbItem = {
    icon: rootIcon.value,
    id: "root",
    title: props.space?.name,
  };

  if (!props.activeWorkflowGroup) {
    return [rootBreadcrumbItem];
  }

  const { path } = props.activeWorkflowGroup;

  const rootBreadcrumb: BreadcrumbItem = {
    ...rootBreadcrumbItem,
    clickable: path.length > 0,
  };
  const lastPathIndex = path.length - 1;

  return [rootBreadcrumb].concat(
    path.map(
      (pathItem, index) =>
        ({
          text: pathItem.name,
          id: pathItem.id,
          clickable: index !== lastPathIndex,
          title: pathItem.name,
        }) satisfies BreadcrumbItem,
    ),
  );
});

const onBreadcrumbClick = ({ id }: BreadcrumbItem) => {
  emit("click", id as string);
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
