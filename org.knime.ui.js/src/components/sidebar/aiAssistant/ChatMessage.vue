<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useStore } from "vuex";

import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import type { NativeNode } from "@/api/gateway-api/generated-api";
import LoadingIcon from "webapps-common/ui/assets/img/icons/reload.svg";

import NodeList from "@/components/nodeRepository/NodeList.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";

interface Props {
  role: string;
  content?: string;
  nodes?: NativeNode[];
  statusUpdate?: string;
  isError?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  nodes: () => [],
  statusUpdate: "",
  isError: false,
});

const nodeTemplates = ref([]);

const store = useStore();

watchEffect(async () => {
  if (props.role !== "assistant") {
    return;
  }

  nodeTemplates.value = await Promise.all(
    props.nodes.map((nodeId) =>
      store.dispatch("nodeRepository/getNodeTemplate", nodeId)
    )
  );
});

const isUser = computed(() => props.role === "user");
const isAssistant = computed(() => props.role === "assistant");
const isDefinedRole = computed(() => isUser.value || isAssistant.value);
</script>

<template>
  <div class="chat-message">
    <div v-if="isDefinedRole" class="content" :class="{ user: isUser }">
      <div class="icon" :class="{ assistant: isAssistant }">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else />
      </div>
      <div class="container">
        <div v-if="props.content" :class="{ error: props.isError }">
          {{ props.content }}
        </div>
        <div v-else>
          <div class="placeholder" />
          <div class="placeholder" />
        </div>
        <NodeList
          v-if="nodeTemplates.length"
          :nodes="nodeTemplates"
          class="node-list"
        >
          <template #item="slotProps">
            <DraggableNodeTemplate v-bind="slotProps" />
          </template>
        </NodeList>
      </div>
    </div>
    <div v-if="props.statusUpdate" class="status-update">
      <LoadingIcon class="loading-icon" />
      {{ props.statusUpdate }}
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes knight-rider {
  0% {
    background-position: -200px 0;
  }

  100% {
    background-position: 200px 0;
  }
}

@keyframes rotate-animation {
  0% {
    transform: rotate(360deg);
  }

  100% {
    transform: rotate(0deg);
  }
}

.chat-message {
  & .content {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    padding: 10px 2px;
    border-bottom: 1px lightgray solid;
    overflow: hidden;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    font-size: 16px;
    line-height: 18.4px;

    & .icon {
      margin-right: 12px;
      background-color: var(--knime-white);
      border-radius: 100%;
      height: 32px;
      width: 32px;
      display: flex;
      justify-content: center;
      align-items: center;

      & svg {
        @mixin svg-icon-size 24;
      }

      &.assistant {
        & svg {
          margin-top: -4px;

          @mixin svg-icon-size 20;
        }
      }
    }

    & .container {
      flex: 1;
      flex-direction: column;
      padding-top: 2px;

      & .error {
        color: var(--knime-coral);
      }

      & .placeholder {
        display: inline-block;
        width: 100%;
        height: 18px;
        background: linear-gradient(
          to right,
          var(--knime-porcelain) 0%,
          var(--knime-silver-sand-semi) 25%,
          var(--knime-porcelain) 50%
        );
        background-size: 200px 20px;
        background-position: -50px 0;
        animation: knight-rider 2s linear infinite;
      }

      & .node-list {
        margin-top: 20px;
      }
    }
  }

  & .status-update {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 5px;
    font-size: 14px;

    & svg.loading-icon {
      animation: rotate-animation 2s linear infinite;

      @mixin svg-icon-size 14;
    }
  }
}
</style>
