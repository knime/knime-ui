<script setup lang="ts">
import NodeDescriptionPortal from "./NodeDescriptionPortal.vue";
import Chat from "./chat/Chat.vue";
import type { ChainType } from "./types";

type Props = {
  chainType: ChainType;
};

defineProps<Props>();
</script>

<template>
  <Chat v-show="chainType === 'qa'" chain-type="qa" />
  <Chat v-show="chainType === 'build'" chain-type="build" />
  <NodeDescriptionPortal />
</template>
