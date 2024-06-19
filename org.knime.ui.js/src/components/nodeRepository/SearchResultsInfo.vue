<script setup lang="ts">
import { API } from "@api";
import CircleInfoIcon from "webapps-common/ui/assets/img/icons/network-workflow.svg";
import FilterCheckIcon from "webapps-common/ui/assets/img/icons/filter-check.svg";
import Button from "webapps-common/ui/components/Button.vue";
import MoreNodesIllustration from "@/assets/more-nodes-illustration.svg";
import { isDesktop } from "@/environment";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import DummyNodes from "@/assets/workflow-coach-dummy-nodes.svg";

type Props = {
  numFilteredOutNodes: number;
  isNodeListEmpty: boolean;
  showDownloadButton: boolean;
  searchHubLink: string;
  isQuickAddNodeMenu: boolean;
};

defineProps<Props>();

const openKnimeUIPreferencePage = () => {
  API.desktop.openWebUIPreferencePage();
};
</script>

<template>
  <div v-if="numFilteredOutNodes > 0" class="filtered-nodes-wrapper">
    <div class="filtered-nodes-content">
      <template v-if="isDesktop">
        <DummyNodes class="dummy-nodes" />
        <span>
          <b>Change filter settings</b> to “All nodes“ to see more advanced
          nodes matching your search criteria.
        </span>

        <Button
          primary
          compact
          class="filtered-nodes-button"
          @click="openKnimeUIPreferencePage"
        >
          <FilterCheckIcon />Change filter settings
        </Button>
      </template>
      <template v-else>
        <span>
          There are no available matching nodes. To work with more nodes,
          download the KNIME Analytics Platform.
        </span>
        <DownloadAPButton
          v-if="showDownloadButton"
          compact
          src="node-repository"
          class="filtered-nodes-button"
        />
      </template>
    </div>
  </div>
  <div
    v-else-if="isNodeListEmpty"
    class="filtered-nodes-wrapper"
    :class="{ mini: isQuickAddNodeMenu }"
  >
    <template v-if="isDesktop">
      <div class="filtered-nodes-content">
        <CircleInfoIcon class="info-icon" />
        <span
          >There are no matching nodes. <br />
          Search the
          <a :href="searchHubLink">KNIME Community Hub</a>
          to find more nodes and extensions.</span
        >
      </div>
    </template>
    <div
      v-else
      class="filtered-nodes-content filtered-nodes-empty"
      :class="{ mini: isQuickAddNodeMenu }"
    >
      <MoreNodesIllustration />
      <span>
        There are more open source extensions and nodes available in the full
        version of the KNIME Analytics Platform.
      </span>
      <br />
      <span v-if="!isQuickAddNodeMenu">
        For example, such as reporting, access to and processing of complex data
        types, as well as the addition of advanced machine learning algorithms
        and much more.
      </span>
      <DownloadAPButton
        compact
        src="node-repository"
        class="filtered-nodes-button"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.filtered-nodes-wrapper {
  padding-top: 20px;
  display: flex;
  align-items: center;
  margin: 20px 10px;

  &.mini {
    padding-top: 0;
  }

  & .info-icon {
    @mixin svg-icon-size 32;

    stroke: var(--knime-masala);
    min-width: 20px;
  }

  & .filtered-nodes-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-weight: 500;
    font-size: 13px;
    width: 100%;

    & .filtered-nodes-button {
      margin-top: 15px;
    }

    & .dummy-nodes {
      margin: 0 0 24px 0;
      filter: blur(2px);
      align-self: center;
    }
  }

  & .filtered-nodes-empty {
    align-items: center;
    font-style: normal;

    & svg {
      margin: 0 45px 45px;
    }

    & span {
      text-align: center;
    }

    &.mini {
      & svg {
        margin: 0 70px 45px;
      }
    }
  }
}
</style>
