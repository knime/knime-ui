<script setup lang="ts">
import { computed , onMounted } from "vue";
import { useStore } from "@/composables/useStore";
import SideDrawer from "webapps-common/ui/components/SideDrawer.vue";
import Button from "webapps-common/ui/components/Button.vue";

import SplitPanel from "@/components/common/SplitPanel.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import TooltipContainer from "@/components/application/TooltipContainer.vue";
import WorkflowToolbar from "@/components/toolbar/WorkflowToolbar.vue";
import WorkflowPanel from "@/components/workflow/WorkflowPanel.vue";

/**
 * Component that acts as a router page to render the workflow
 */
const store = useStore();

const workflow = computed(() => store.state.workflow.activeWorkflow);
const savedSecondarySize = computed({
  get() {
    return store.state.settings.settings.nodeOutputSize;
  },
  set(value: number) {
    store.dispatch("settings/updateSetting", {
      key: "nodeOutputSize",
      value,
    });
  },
});

const isExpanded = computed(() => store.state.embeddedFeature.isExpanded);
const closeDrawer = () => {
  store.commit("embeddedFeature/setIsExpanded", false);
};

onMounted(() => {
  window.addEventListener("message", (event) => {
    console.log("postmessage", event);
    if (event.data === "close") {
      closeDrawer();
    }

  })
});
</script>

<template>
  <div v-if="workflow" id="workflow-page">
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer id="tooltip-container" />
    <Sidebar id="sidebar" />

    <SideDrawer class="side-drawer" :is-expanded="isExpanded">
      <iframe
        src="http://localhost:3000/development%20team/spaces/Helian's%20space/Sample%20WF~zKtID6oOJwEyDyZY/current-state?embed=adhoc"
        class="iframe"
      />
      <Button with-border @click="closeDrawer"> Close me! </Button>
    </SideDrawer>

    <main class="workflow-area">
      <SplitPanel
        v-model:secondary-size="savedSecondarySize"
        data-test-id="node-output-split-panel"
        direction="down"
        :secondary-max-size="90"
        :secondary-snap-size="15"
      >
        <WorkflowPanel id="workflow-panel" />
        <template #secondary>
          <NodeOutput />
        </template>
      </SplitPanel>
    </main>
  </div>
</template>

<style lang="postcss" scoped>
#workflow-page {
  display: grid;
  grid-template:
    "toolbar toolbar" min-content
    "sidebar workflow" auto
    / min-content auto;
  height: 100%;
  background: var(--knime-white);
  color: var(--knime-masala);
  overflow: hidden;
}

#sidebar {
  grid-area: sidebar;
}

#toolbar {
  grid-area: toolbar;
  height: var(--app-toolbar-height);
  flex: 0 0 auto;
  padding: 10px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

main {
  display: flex;
  overflow: auto;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

.workflow-area {
  grid-area: workflow;
  overflow: hidden;
}

.floating-download-button {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: var(--shadow-elevation-2);
}

.iframe {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  border: none;
}
</style>
