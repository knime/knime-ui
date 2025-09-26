<script setup lang="ts">
import { onMounted, ref } from "vue";

import { Button, useHint } from "@knime/components";
import PlusIcon from "@knime/styles/img/icons/plus-small.svg";

import { HINTS } from "@/hints/hints.config";
import { cachedLocalSpaceProjectId } from "@/store/spaces/common";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";

import PageTitle from "./PageTitle.vue";
import RecentWorkflowsList from "./RecentWorkflowsList.vue";

const { fetchWorkflowGroupContent } = useSpaceOperationsStore();
const { setCreateWorkflowModalConfig } = useSpacesStore();

const createNewWorkflowButton = ref<InstanceType<typeof Button>>();

const { createHint } = useHint();

onMounted(() => {
  createHint({
    hintId: HINTS.NEW_WORKFLOW,
    referenceElement: createNewWorkflowButton,
  });
});

const createWorkflowLocally = async () => {
  await fetchWorkflowGroupContent({
    projectId: cachedLocalSpaceProjectId,
  });

  setCreateWorkflowModalConfig({
    isOpen: true,
    projectId: cachedLocalSpaceProjectId,
  });
};
</script>

<template>
  <div class="recent-workflows">
    <PageTitle title="Recently used workflows and components">
      <template #append>
        <Button
          ref="createNewWorkflowButton"
          compact
          primary
          class="create-workflow-button"
          title="Create new workflow"
          @click="createWorkflowLocally"
        >
          <PlusIcon />
          <span>Create new workflow</span>
        </Button>
      </template>
    </PageTitle>

    <RecentWorkflowsList />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.recent-workflows {
  padding: 24px;
  container: wrapper / inline-size;
}

.create-workflow-button {
  & svg {
    margin-right: 4px;
  }
}

@container wrapper (max-width: 580px) {
  .create-workflow-button {
    width: 30px;
    height: 30px;

    & span {
      display: none;
    }

    & svg {
      margin-right: 0;
      padding-left: 1px;
      top: 0;
    }

    &.compact {
      min-width: auto;
      padding: 5px;
    }
  }
}
</style>
