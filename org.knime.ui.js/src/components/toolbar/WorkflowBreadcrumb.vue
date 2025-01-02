<script>
import LinkedComponentIcon from "@knime/styles/img/icons/linked-component.svg";
import LinkedMetanodeIcon from "@knime/styles/img/icons/linked-metanode.svg";
import MetaNodeIcon from "@knime/styles/img/icons/metanode.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import { APP_ROUTES } from "@/router/appRoutes";

/**
 * A breadcrumb for navigating through the component / metanode hierarchy inside a workflow
 */
export default {
  components: {
    ActionBreadcrumb,
  },
  props: {
    workflow: {
      type: Object,
      required: true,
    },
  },
  computed: {
    items() {
      let parents = this.workflow.parents || [];
      let items = parents.map(
        ({ containerType, name, containerId = "root", linked }) => ({
          icon: this.getIcon(containerType, linked),
          text: name,
          id: containerId,
        }),
      );

      const { containerType, linked } = this.workflow.info;
      items.push({
        text: this.workflow.info.name,
        icon: this.getIcon(containerType, linked),
      });
      return items;
    },
  },
  methods: {
    getIcon(type, linked) {
      if (linked && type === "component") {
        return LinkedComponentIcon;
      } else if (linked && type === "metanode") {
        return LinkedMetanodeIcon;
      } else if (type === "component") {
        return NodeWorkflowIcon;
      } else if (type === "metanode") {
        return MetaNodeIcon;
      } else {
        return null;
      }
    },
    onClick({ id }) {
      this.$router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: this.workflow.projectId, workflowId: id },
        force: true,
        replace: true,
      });
    },
  },
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
