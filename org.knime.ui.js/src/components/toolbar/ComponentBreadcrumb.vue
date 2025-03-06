<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

import LinkedComponentIcon from "@knime/styles/img/icons/linked-component.svg";
import LinkedMetanodeIcon from "@knime/styles/img/icons/linked-metanode.svg";
import MetaNodeIcon from "@knime/styles/img/icons/metanode.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";

import type { Workflow } from "@/api/custom-types";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import { APP_ROUTES } from "@/router/appRoutes";

const props = defineProps<{
  workflow: Workflow;
}>();

const router = useRouter();

const getIcon = (type: string, linked: boolean) => {
  if (linked && type === "component") {
    return LinkedComponentIcon;
  } else if (linked && type === "metanode") {
    return LinkedMetanodeIcon;
  } else if (type === "component") {
    return NodeWorkflowIcon;
  } else if (type === "metanode") {
    return MetaNodeIcon;
  } else {
    // eslint-disable-next-line no-undefined
    return undefined;
  }
};

const items = computed(() => {
  let parents = props.workflow.parents || [];
  let items = parents.map(
    ({ containerType, name, containerId = "root", linked = false }) => ({
      icon: getIcon(containerType, linked),
      text: name,
      id: containerId,
    }),
  );

  const {
    containerType,
    containerId = "root",
    linked = false,
  } = props.workflow.info;
  items.push({
    text: props.workflow.info.name,
    icon: getIcon(containerType, linked),
    id: containerId,
  });
  return items;
});

const onClick = ({ id }: { id: string }) => {
  router.push({
    name: APP_ROUTES.WorkflowPage,
    params: { projectId: props.workflow.projectId, workflowId: id },
    force: true,
    replace: true,
  });
};
</script>

<template>
  <ActionBreadcrumb :items="items" @click="onClick" />
</template>

<style lang="postcss" scoped>
:deep(ul) {
  user-select: none;
}

nav {
  overflow: hidden;

  & :deep(span) {
    max-width: 400px;
  }
}
</style>
