<script>
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import { mapState } from "vuex";

export default {
  components: {
    SpaceExplorer,
  },
  computed: {
    ...mapState("application", ["activeProjectId"]),
  },
};
</script>

<template>
  <SpaceExplorer mode="mini" :project-id="activeProjectId" />
</template>
