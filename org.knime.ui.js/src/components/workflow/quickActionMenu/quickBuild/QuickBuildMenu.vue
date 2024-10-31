<script setup lang="ts">
import { toRefs } from "vue";

import { Button } from "@knime/components";
import GoBackIcon from "@knime/styles/img/icons/arrow-back.svg";

import Kai from "@/components/kai/Kai.vue";
import { useQuickBuild } from "@/components/kai/quickBuild/useQuickBuild";

type Props = {
  nodeId?: string | null;
};

const props = withDefaults(defineProps<Props>(), {
  nodeId: null,
});
defineEmits(["menuBack"]);

const { nodeId } = toRefs(props);

const { isProcessing } = useQuickBuild({ nodeId });
</script>

<template>
  <div class="quick-build-menu">
    <div v-if="!isProcessing" class="header">
      KNIME AI build mode
      <Button with-border @click="$emit('menuBack')"><GoBackIcon /></Button>
    </div>
    <div class="main">
      <Kai :node-id="nodeId" mode="quick-build" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .quick-build-menu {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;

  & .header {
    margin-top: -8px;
    height: 42px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--knime-silver-sand);
    font-weight: 500;
    font-size: 16px;

    & button {
      padding: 0;
      width: 30px;
      height: 30px;
      border-color: var(--knime-silver-sand);

      &:hover {
        background-color: var(--knime-silver-sand);
      }

      & svg {
        @mixin svg-icon-size 18;

        margin-left: 5px;
      }
    }
  }

  & .main {
  }
}
</style>
