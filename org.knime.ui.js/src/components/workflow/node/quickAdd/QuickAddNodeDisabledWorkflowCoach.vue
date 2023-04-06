<script lang="ts">
import { defineComponent } from 'vue';

import { API } from '@api';
import Button from 'webapps-common/ui/components/Button.vue';

export default defineComponent({
    components: {
        Button
    },
    methods: {
        openWorkflowCoachPreferencePage() {
            API.desktop.openWorkflowCoachPreferencePage();
        }
    }
});
</script>

<template>
  <div
    class="disabled-workflow-coach"
  >
    <h2>Workflow coach</h2>
    <span>
      The workflow coach will help you build workflows more efficiently by suggesting the next node for your
      workflow.
    </span>
    <span>
      To activate this function you need to change the settings inside the preference page.
    </span>
    <Button
      primary
      class="button"
      @click="openWorkflowCoachPreferencePage"
    >
      Open Preferences
    </Button>
  </div>
</template>

<style lang="postcss">
.disabled-workflow-coach {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-content: center;
  justify-content: center;
  width: 100%;
  flex: 1;
  padding: 20px;
  background: var(--knime-black-semi);
  color: var(--knime-white);
  font-family: "Roboto Condensed", sans-serif;

  & h2 {
    font-size: 18px;
    line-height: 21px;
    font-weight: 400;
  }

  & span {
    font-size: 13px;
    line-height: 15px;
    padding: 5px 0 10px;
  }

  & .button {
    padding: 6px 15px;
    height: 30px;
    font-size: 13px;
    font-family: "Roboto Condensed", sans-serif;
    margin-top: 20px;
  }
}
</style>
