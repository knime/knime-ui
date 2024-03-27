<script lang="ts" setup>
import { computed, onUnmounted } from "vue";
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import { useStore } from "@/composables/useStore";

const store = useStore();
const activeProjectId = computed(() => store.state.application.activeProjectId);
const currentSelectedItemIds = computed(
  () => store.state.spaces.currentSelectedItemIds,
);

onUnmounted(() => {
  store.commit("spaces/setCurrentSelectedItemIds", []);
});
</script>

<template>
  <SpaceExplorer
    v-if="activeProjectId"
    mode="mini"
    :project-id="activeProjectId"
    :selected-item-ids="currentSelectedItemIds"
    @update:selected-item-ids="
      store.commit('spaces/setCurrentSelectedItemIds', $event)
    "
  />
</template>
