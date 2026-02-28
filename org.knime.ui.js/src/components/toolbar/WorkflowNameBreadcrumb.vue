<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, markRaw } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { type MenuItem, SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import ChevronRightIcon from "@knime/styles/img/icons/arrow-next.svg";
import LinkedComponentIcon from "@knime/styles/img/icons/linked-component.svg";
import LinkedMetanodeIcon from "@knime/styles/img/icons/linked-metanode.svg";
import MetaNodeIcon from "@knime/styles/img/icons/metanode.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";

import type { Workflow } from "@/api/custom-types";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";

type Props = {
  workflow: Workflow;
};

const props = defineProps<Props>();

const router = useRouter();
const { revealSingleItem, canRevealItem, revealActionMetadata } =
  useRevealInSpaceExplorer();
const { activeProjectOrigin, openProjects, activeProjectId } = storeToRefs(
  useApplicationStore(),
);

const isInSublevel = computed(() => (props.workflow.parents?.length ?? 0) > 0);
const currentName = computed(() => props.workflow.info.name);

const getIcon = (type: string, linked: boolean) => {
  if (linked && type === "component") {
    return markRaw(LinkedComponentIcon);
  }
  if (linked && type === "metanode") {
    return markRaw(LinkedMetanodeIcon);
  }
  if (type === "component") {
    return markRaw(NodeWorkflowIcon);
  }
  if (type === "metanode") {
    return markRaw(MetaNodeIcon);
  }
  return undefined;
};

// ─── Icon helper ─────────────────────────────────────────────────────────────

const parentItems = computed<MenuItem[]>(() => {
  const parents = props.workflow.parents ?? [];
  return parents.map(
    ({ containerType, name, containerId = "root", linked = false }) => ({
      text: name,
      icon: getIcon(containerType, linked),
      metadata: { id: containerId },
    }),
  );
});

const onParentItemClick = (_: MouseEvent, item: MenuItem) => {
  const meta = item.metadata as { id: string };
  router.push({
    name: APP_ROUTES.WorkflowPage,
    params: {
      projectId: props.workflow.projectId,
      workflowId: meta.id,
    },
    force: true,
    replace: true,
  });
};

// ─── Sub-level: parent nav items for "…" menu ─────────────────────────────────

// ─── Root level: workflow actions dropdown ────────────────────────────────────

const rootDropdownItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [];

  if (
    activeProjectOrigin.value &&
    canRevealItem(activeProjectOrigin.value.providerId)
  ) {
    items.push({
      text: revealActionMetadata.label,
      icon: revealActionMetadata.icon,
      metadata: {
        handler: async () => {
          const projectName = openProjects.value.find(
            (project) => project.projectId === activeProjectId.value,
          )!.name;
          await revealSingleItem(activeProjectOrigin.value!, projectName);
        },
      },
    });
  }

  return items;
});

const onRootMenuItemClick = (_: MouseEvent, item: MenuItem) => {
  (item.metadata as { handler?: () => void })?.handler?.();
};
</script>

<template>
  <div class="workflow-name-breadcrumb">
    <!-- Sub-level: "… > currentName" -->
    <template v-if="isInSublevel">
      <SubMenu
        compact
        :teleport-to-body="false"
        :items="parentItems"
        button-title="Navigate to parent"
        orientation="right"
        @item-click="onParentItemClick"
      >
        <template #default>
          <span class="ellipsis">…</span>
        </template>
      </SubMenu>
      <ChevronRightIcon class="chevron" aria-hidden="true" focusable="false" />
      <span class="current-name" :title="currentName">{{ currentName }}</span>
    </template>

    <!-- Root level: name + optional workflow-actions dropdown -->
    <template v-else>
      <span class="current-name" :title="currentName">{{ currentName }}</span>

      <SubMenu
        v-if="rootDropdownItems.length && !workflow.info.version"
        compact
        :teleport-to-body="false"
        :items="rootDropdownItems"
        button-title="Workflow actions"
        orientation="right"
        @item-click="onRootMenuItemClick"
      >
        <template #default>
          <DropdownIcon class="dropdown-icon" />
        </template>
      </SubMenu>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.workflow-name-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--kds-spacing-container-0-5x);
  font: var(--kds-font-base-body-small);
  color: var(--kds-color-text-and-icon-subtle);
  white-space: nowrap;
  min-width: 0;

  & .current-name {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
    color: var(--kds-color-text-and-icon-neutral);
    font: var(--kds-font-base-interactive-small);
  }

  & .ellipsis {
    font: var(--kds-font-base-interactive-small);
    color: var(--kds-color-text-and-icon-subtle);
    padding: 0 2px;
  }

  & .chevron {
    flex-shrink: 0;
    stroke: var(--kds-color-text-and-icon-subtle);
    width: 12px;
    height: 12px;
    stroke-width: 3px;
  }

  & .dropdown-icon {
    width: 12px;
    height: 12px;
    stroke-width: 3.5px;
    stroke: var(--kds-color-text-and-icon-neutral);
  }

  & .version-info {
    font: var(--kds-font-base-body-small);
    color: var(--kds-color-text-and-icon-subtle);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & :deep(.submenu-toggle) {
    border-radius: var(
      --kds-legacy-button-border-radius,
      var(--kds-border-radius-container-0-37x)
    );

    & svg {
      stroke-width: 3.5px;
      width: 12px;
      height: 12px;
    }

    &.expanded {
      background-color: var(--kds-color-background-neutral-active);
    }

    &:not(.expanded) svg {
      stroke: var(--kds-color-text-and-icon-neutral);
    }

    &:focus-visible {
      outline: var(--kds-border-action-focused);
      outline-offset: 1px;
      background: transparent;
    }
  }
}
</style>
