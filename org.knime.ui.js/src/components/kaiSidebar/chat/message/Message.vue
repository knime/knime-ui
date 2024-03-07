<script setup lang="ts">
import { computed } from "vue";
import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import { renderMarkdown } from "./markdown";
import MessagePlaceholder from "./MessagePlaceholder.vue";
import KaiStatus from "./KaiStatus.vue";
import KaiReferences from "./KaiReferences.vue";
import SuggestedExtensions from "./SuggestedExtensions.vue";
import SuggestedNodes from "./SuggestedNodes.vue";
import { useNodeTemplates } from "./useNodeTemplates";
import type { NodeWithExtensionInfo, References } from "../../types";

const emit = defineEmits(["nodeTemplatesLoaded", "showNodeDescription"]);

interface Props {
  role: string;
  content?: string;
  nodes?: NodeWithExtensionInfo[];
  references?: References;
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
const htmlContent = computed(() => renderMarkdown(props.content));
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
      <!-- eslint-disable vue/no-v-html  -->
      <div v-if="content" class="content" v-html="htmlContent" />
      <MessagePlaceholder v-else />
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
  width: 100%;
  margin-bottom: 20px;
  font-size: 13px;
  font-weight: 400;

  & .header {
    height: 21px;
    display: flex;
    justify-content: flex-end;

    & .icon {
      position: absolute;
      top: 0;
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
    border-radius: 0 5px 5px;
    background-color: var(--knime-white);
    padding: 10px 8px;

    &.user {
      border-radius: 5px 0 5px 5px;
    }

    &.error {
      background-color: var(--knime-coral-light);
    }

    & :deep(.content) {
      overflow-wrap: break-word;
      overflow-x: hidden;

      & *:first-child {
        margin-top: 0;
      }

      & *:last-child {
        margin-bottom: 0;
      }

      & h1 {
        font-size: 1.5em;
      }

      & h2,
      & h3,
      & h4,
      & h5,
      & h6 {
        font-size: 1em;
      }

      & ul,
      & ol {
        list-style: none;
        padding-left: 0;

        & li {
          margin-bottom: 0.4em;

          &::before {
            font-weight: bold;
            margin-right: 5px;
          }

          & p:first-child {
            display: inline;
          }
        }
      }

      & ul {
        & li {
          &::before {
            content: "•";
          }
        }
      }

      & ol {
        counter-reset: list-counter;

        & li {
          counter-increment: list-counter;

          &::before {
            content: counter(list-counter) ".";
          }
        }
      }
    }
  }
}
</style>
