<script setup lang="ts">
import { computed, watch } from "vue";

import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";

import Placeholder from "./Placeholder.vue";
import Status from "./Status.vue";
import References from "./References.vue";
import Extensions from "./Extensions.vue";
import Nodes from "./Nodes.vue";

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
  callback: () => emit("nodeTemplatesLoaded")
});

const isUser = computed(() => props.role === "user");
</script>

<template>
  <div class="chat-message">
    <div class="header">
      <div class="icon" :class="{ user: isUser }">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else />
      </div>
    </div>
    <div class="body" :class="{ user: isUser, error: isError }">
      <div class="content">
        <!-- eslint-disable vue/no-v-html  -->
        <div v-if="content" v-html="content" />
        <Placeholder v-else />
        <References :references="references" />
      </div>
      <Nodes :node-templates="nodeTemplates" />
      <Extensions :extensions="uninstalledExtensions" />
      <Status :status="statusUpdate" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.chat-message {
  position: relative;
  margin-bottom: 20px;
  font-size: 13px;
  font-weight: 500;

  & .header {
    height: 21px;

    & .icon {
      position: absolute;
      top: 0px;
      background-color: var(--knime-white);
      border: 2px solid var(--knime-porcelain);
      border-radius: 100%;
      height: 26px;
      width: 26px;
      display: flex;
      justify-content: center;
      align-items: center;

      &.user {
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
