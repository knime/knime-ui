<script setup lang="ts">
import { Button } from "@knime/components";
import CheckIcon from "@knime/styles/img/icons/check.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import Message from "../chat/message/Message.vue";

type Props = {
  message: string;
};

defineProps<Props>();
defineEmits(["close"]);
</script>

<template>
  <div class="quick-build-result">
    <Message :role="KaiMessage.RoleEnum.Assistant" :content="message" />
    <Button class="button" compact with-border @click="$emit('close')"
      ><CheckIcon />Done</Button
    >
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-result {
  text-align: right;

  & .button {
    margin-top: -20px;
  }

  & * {
    text-align: initial;
  }
}
</style>
