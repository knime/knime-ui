<script setup lang="ts">
import { ref } from "vue";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import Chat from "./Chat/Chat.vue";
import BasePanel from "./BasePanel.vue";
import type { ChainType } from "./types";

const chainType = ref<ChainType>("qa");
</script>

<template>
  <BasePanel>
    <template #headerControls>
      <ValueSwitch
        v-model="chainType"
        compact
        :possible-values="[
          { id: 'qa', text: 'Q&A' },
          { id: 'build', text: 'Build' },
        ]"
      />
    </template>

    <Chat v-show="chainType === 'qa'" chain-type="qa" />
    <Chat v-show="chainType === 'build'" chain-type="build" />
  </BasePanel>
</template>

<style lang="postcss" scoped></style>
