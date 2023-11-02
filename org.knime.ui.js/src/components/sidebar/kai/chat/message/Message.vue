<script setup lang="ts">
import { computed } from "vue";
import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import MessagePlaceholder from "./MessagePlaceholder.vue";
import KaiStatus from "./KaiStatus.vue";
import KaiReferences from "./KaiReferences.vue";
import SuggestedExtensions from "./SuggestedExtensions.vue";
import SuggestedNodes from "./SuggestedNodes.vue";
import useNodeTemplates from "./useNodeTemplates";
import type { NodeWithExtensionInfo } from "../../types";

const emit = defineEmits(["nodeTemplatesLoaded", "showNodeDescription"]);

interface Props {
  role: string;
  content?: string;
  nodes?: NodeWithExtensionInfo[];
  references?: {
    [refName: string]: string[];
  };
  statusUpdate?: string;
  isError?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  nodes: () => [],
  references: () => ({}),
  statusUpdate: "",
  isError: false,
});

const { nodeTemplates, uninstalledExtensions } = useNodeTemplates({
  role: props.role,
  nodes: props.nodes,
  callback: () => emit("nodeTemplatesLoaded"),
});

const isUser = computed(() => props.role === "user");
</script>

<template>
  <div class="message">
    <div class="header">
      <div class="icon" :class="{ user: isUser }">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else />
      </div>
      <KaiReferences :references="references" />
    </div>
    <div class="body" :class="{ user: isUser, error: isError }">
      <div class="content">
        <!-- eslint-disable vue/no-v-html  -->
        <div v-if="content" v-html="content" />
        <MessagePlaceholder v-else />
      </div>
      <SuggestedNodes :node-templates="nodeTemplates" />
      <SuggestedExtensions :extensions="uninstalledExtensions" />
      <KaiStatus :status="statusUpdate" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.message {
  position: relative;
  margin-bottom: 20px;
  font-size: 13px;
  font-weight: 500;

  & .header {
    height: 21px;
    display: flex;
    flex-direction: row;
    flex-direction: row-reverse;

    & .icon {
      position: absolute;
      top: 0px;
      left: 0;
      background-color: var(--knime-white);
      border: 2px solid var(--knime-porcelain);
      border-radius: 100%;
      height: 26px;
      width: 26px;
      display: flex;
      justify-content: center;
      align-items: center;

      &.user {
        left: auto;
        right: 0;
      }

      & svg {
        margin-top: -2px;
        @mixin svg-icon-size 16;
      }

      &.user svg.assistant {
        margin-top: -4px;
      }
    }
  }

  & .body {
    border-radius: 0px 5px 5px 5px;
    background-color: var(--knime-white);
    padding: 10px 8px 10px 8px;

    &.user {
      border-radius: 5px 0px 5px 5px;
    }

    &.error {
      background-color: var(--knime-coral-light);
    }

    & .content {
      overflow: hidden;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
  }
}
</style>
