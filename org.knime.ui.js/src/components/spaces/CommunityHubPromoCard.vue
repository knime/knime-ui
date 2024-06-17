<script setup lang="ts">
import { computed } from "vue";

import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import Button from "webapps-common/ui/components/Button.vue";

import ProductKapSave from "@/assets/product-kap-save.svg";
import ProductKapUpskill from "@/assets/product-kap-upskill.svg";
import ProductKapVisualize from "@/assets/product-kap-visualize.svg";

import { useStore } from "@/composables/useStore";
import { COMMUNITY_HUB_ID } from "@/store/spaces/util";

const store = useStore();

const shouldDisplayPromo = computed(() => {
  const spaceProviders = store.state.spaces.spaceProviders ?? {};
  const isConnectingToCommunityHub =
    store.state.spaces.isConnectingToProvider === COMMUNITY_HUB_ID;

  return (
    spaceProviders[COMMUNITY_HUB_ID] &&
    !spaceProviders[COMMUNITY_HUB_ID].connected &&
    !isConnectingToCommunityHub
  );
});
</script>

<template>
  <div v-if="shouldDisplayPromo" class="promo">
    <div class="images">
      <ProductKapSave />
      <ProductKapUpskill />
      <ProductKapVisualize />
    </div>

    <div class="text">
      <h4 class="title">KNIME Community Hub</h4>
      <p>Join one of the most active open source data science communities</p>
      <ul>
        <li>Go-to space for anyone working with data</li>
        <li>Collaborate with your team</li>
      </ul>
    </div>

    <Button
      with-border
      compact
      href="https://knime.com/modern-ui-hub-tile-link?src=knimeappmodernui"
    >
      <LinkExternalIcon />
      Explore the KNIME Community Hub
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.promo {
  background: var(--knime-gray-ultra-light);
  padding: 24px;
  border-radius: 5px;
  box-shadow: var(--shadow-elevation-1);
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 12px;

  & .images {
    display: flex;
    gap: 30px;
  }

  & .text {
    & h4 {
      margin: 0;
    }

    & ul {
      margin: 0;
      padding-left: 18px;
    }
  }
}
</style>
