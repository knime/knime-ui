<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import PlusIcon from "webapps-common/ui/assets/img/icons/plus-small.svg";
import Button from "webapps-common/ui/components/Button.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import Card from "@/components/common/Card.vue";
import CardContent from "@/components/common/CardContent.vue";
import { cachedLocalSpaceProjectId } from "@/store/spaces";

const store = useStore();

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

const onCommunityHubCardClick = () => {
  window.open(
    "https://knime.com/modern-ui-hub-home-link?src=knimeappmodernui",
    "_blank",
  );
};
</script>

<template>
  <div class="entry-page-header">
    <span class="header-text">Create and explorer workflows</span>
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
      <div v-if="!areExampleProjectsAvailable">
        <Card class="community-hub-card" @click="onCommunityHubCardClick">
          <div class="community-hub-content">
            <LinkExternalIcon />
            <p>Find more resources on the KNIME Community Hub</p>
          </div>
        </Card>
      </div>
    </div>
    <div v-if="areExampleProjectsAvailable" class="community-hub-button">
      <Button with-border href="https://hub.knime.com/">
        <LinkExternalIcon />
        <span
          >Find more resources for spreadsheet automation on the KNIME Community
          Hub</span
        >
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.entry-page-header {
  display: flex;
  flex-direction: column;
  padding: 30px 50px;

  & .header-text {
    font-weight: 700;
    font-size: 20px;
    line-height: 28px;
    padding-bottom: 20px;
  }

  & .cards {
    display: grid;
    grid-auto-flow: column;
    gap: 24px;
    width: 75px;

    & span {
      text-align: center;
      font-size: 16px;
      margin-top: 20px;
      font-weight: 700;
    }

    & p {
      font-size: 16px;
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
</style>
