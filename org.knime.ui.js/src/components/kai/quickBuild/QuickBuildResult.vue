<script setup lang="ts">
import Message from "../chat/message/Message.vue";
import { Button } from "@knime/components";
import CheckIcon from "@knime/styles/img/icons/check.svg";
import { KaiMessage } from "@/api/gateway-api/generated-api";

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
  display: flex;
  flex-direction: column;

  & .button {
    align-self: flex-end;
    margin-top: -20px;
  }
}
</style>
