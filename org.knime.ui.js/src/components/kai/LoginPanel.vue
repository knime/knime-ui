<script setup lang="ts">
import { Button } from "@knime/components";

import { useHubAuth } from "./useHubAuth";

const { authenticateWithHub, hubId } = useHubAuth();
</script>

<template>
  <div class="login-panel">
    <div class="slogan">
      Log in to your KNIME Hub account<br />
      to chat with our AI assistant.
    </div>
    <Button primary compact @click="authenticateWithHub"
      >Login to {{ hubId }}</Button
    >
  </div>
</template>

<style lang="postcss" scoped>
& .login-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  & .slogan {
    margin: 0 30px 30px;
    font-weight: 700;
  }
}
</style>
