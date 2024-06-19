<script lang="ts">
import { defineComponent } from "vue";

import { API } from "@api";
import DummyNodes from "@/assets/workflow-coach-dummy-nodes.svg";
import Button from "webapps-common/ui/components/Button.vue";
import Cog from "webapps-common/ui/assets/img/icons/cog.svg";

export default defineComponent({
  components: {
    Button,
    DummyNodes,
    Cog,
  },
  methods: {
    openWorkflowCoachPreferencePage() {
      API.desktop.openWorkflowCoachPreferencePage();
    },
  },
});
</script>

<template>
  <div class="disabled-workflow-coach">
    <DummyNodes class="dummy-nodes" />
    <span>
      The <strong>workflow coach</strong> will help you build workflows by
      suggesting nodes. To activate this function change the settings in the
      preference page.
    </span>
    <Button
      primary
      class="button"
      compact="compact"
      @click="openWorkflowCoachPreferencePage"
    >
      <cog />Open Preferences
    </Button>
  </div>
</template>

<style lang="postcss">
.disabled-workflow-coach {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-content: center;
  width: 100%;
  flex: 1;
  padding: 0 20px;
  font-size: 13px;
  margin-top: 16px;

  & .dummy-nodes {
    margin: 24px 0;
    filter: blur(2px);
    align-self: center;
  }

  & span {
    padding: 5px 0 10px;
  }

  & .button {
    padding: 6px 15px;
    height: 30px;
    margin-top: 20px;
  }
}
</style>
