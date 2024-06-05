<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import Button from "webapps-common/ui/components/Button.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import PlusIcon from "webapps-common/ui/assets/img/icons/plus-small.svg";
import { cachedLocalSpaceProjectId } from "@/store/spaces";
import { useStore } from "@/composables/useStore";
import Card from "@/components/common/Card.vue";
import CardContent from "@/components/common/CardContent.vue";
import type { ExampleProject } from "@/api/gateway-api/generated-api";

const store = useStore();
const $router = useRouter();

const exampleProjects = computed(() => store.state.application.exampleProjects);
const areExampleProjectsAvailable = computed(
  () => exampleProjects.value.length > 0,
);

const createWorkflowLocally = async () => {
  await store.dispatch("spaces/fetchWorkflowGroupContent", {
    projectId: cachedLocalSpaceProjectId,
  });

  store.commit("spaces/setCreateWorkflowModalConfig", {
    isOpen: true,
    projectId: cachedLocalSpaceProjectId,
  });
};

const onExampleClick = async (example: ExampleProject) => {
  await store.dispatch("spaces/openProject", {
    projectId: cachedLocalSpaceProjectId,
    workflowItemId: example.origin!.itemId,
    $router,
  });
};
</script>

<template>
  <div class="get-started-page-header">
    <span class="header-text">Create and explore workflows</span>

    <div class="cards">
      <Card class="create-workflow" @click="createWorkflowLocally">
        <CardContent padded>
          <div class="icon-wrapper">
            <PlusIcon />
          </div>
          <span>New workflow</span>
          <p>Start with an empty workflow</p>
        </CardContent>
      </Card>

      <template v-if="areExampleProjectsAvailable">
        <Card
          v-for="(example, index) in exampleProjects"
          :key="index"
          class="create-workflow"
          @click="onExampleClick(example)"
        >
          <CardContent padded>
            <img
              class="card-img"
              :src="`data:image/svg+xml;base64,${example.svg}`"
              :alt="`Preview image of ${example.name}`"
            />
            <span>{{ example.name }}</span>
          </CardContent>
        </Card>
      </template>
    </div>
  </div>

  <div class="call-to-action">
    Find more resources for spreadsheet automation on the KNIME Community Hub

    <Button
      class="action-btn"
      compact
      with-border
      on-dark
      href="https://knime.com/modern-ui-hub-home-link?src=knimeappmodernui"
    >
      <LinkExternalIcon />
      <span> Take me there </span>
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.get-started-page-header {
  display: flex;
  flex-direction: column;
  padding: 30px 5px 30px 50px;

  & .header-text {
    font-weight: 700;
    font-size: 20px;
    line-height: 28px;
    padding-bottom: 20px;
  }

  & .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, 250px);
    max-height: 200px;
    padding: 10px;
    margin-left: -10px;
    overflow: hidden;
    gap: 24px;

    & .card {
      min-width: 250px;
      max-height: 180px;
    }

    & .card-img {
      width: 100%;
      max-height: 140px;
      object-fit: contain;
    }

    & span {
      text-align: center;
      font-size: 13px;
      margin-top: 20px;
      font-weight: 700;
    }

    & p {
      font-size: 13px;
    }

    & .create-workflow {
      display: flex;
      align-items: center;
      justify-content: center;

      & .icon-wrapper {
        background: var(--knime-yellow);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
      }

      & svg {
        @mixin svg-icon-size 70;
      }
    }

    & .community-hub-card {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 500px;
      background-color: var(--knime-porcelain);

      & svg {
        @mixin svg-icon-size 22;

        margin-right: 10px;
        stroke: var(--knime-dove-gray);
      }

      & .community-hub-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        color: var(--knime-dove-gray);
      }
    }
  }

  & .community-hub-button {
    padding-top: 40px;
  }
}

.call-to-action {
  background: var(--knime-aquamarine-dark);
  color: var(--knime-white);
  padding: 10px 30px;
  font-weight: 700;
  display: flex;
  align-items: center;

  & .action-btn {
    margin-left: auto;
  }
}
</style>
