<script setup lang="ts">
import { API } from "@api";
import Button from "webapps-common/ui/components/Button.vue";
import BasePanel from "./BasePanel.vue";

const installKai = API.desktop.installKAI;
</script>

<template>
  <BasePanel>
    <div class="installation-panel">
      <div class="slogan">
        KAI is not installed yet. Do you want to give it a try?
      </div>

      <Button primary @click="installKai"> Install</Button>
    </div>
  </BasePanel>
</template>

<style lang="postcss" scoped>
& .installation-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  & .slogan {
    margin: 0 30px 30px;
    font-weight: 500;
  }
}
</style>
