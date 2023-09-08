<script setup lang="ts">
import { computed, watch } from "vue";
import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import LoadingIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import ExternalLinkIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import Button from "webapps-common/ui/components/Button.vue";

import NodeList from "@/components/nodeRepository/NodeList.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import InstallableExtension from "./InstallableExtension.vue";
import useNodeTemplates from "./useNodeTemplates";
import type { NodeWithExtensionInfo } from "./types";

const emit = defineEmits(["nodeTemplatesLoaded"]);

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
});

watch(
  [nodeTemplates, uninstalledExtensions],
  () => emit("nodeTemplatesLoaded"),
  { deep: true },
);

const openReferences = (urls) => urls.forEach((url) => window.open(url));

const isUser = computed(() => props.role === "user");
const hasReferences = computed(
  () => props.references && Object.keys(props.references).length > 0,
);
const hasNodeTemplates = computed(
  () => nodeTemplates.value && nodeTemplates.value.length > 0,
);
const hasUninstalledExtensions = computed(
  () =>
    uninstalledExtensions.value &&
    Object.keys(uninstalledExtensions.value).length > 0,
);
const hasBuildingBlocks = computed(
  () => hasNodeTemplates.value || hasUninstalledExtensions.value,
);
</script>

<template>
  <div class="chat-message">
    <div class="header">
      <div class="icon">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else class="assistant" />
      </div>
      <div class="name">{{ isUser ? "User" : "K-AI" }}</div>
    </div>
    <div class="content">
      <!-- eslint-disable vue/no-v-html  -->
      <div v-if="content" :class="{ error: isError }" v-html="content" />
      <div v-else>
        <div class="placeholder" />
        <div class="placeholder" />
      </div>
      <div v-if="hasReferences" class="references">
        <div v-for="(urls, refName) in references" :key="refName">
          <Button class="ref-button" @click="openReferences(urls)">
            <ExternalLinkIcon /> Source in {{ refName }}
          </Button>
        </div>
      </div>
    </div>
    <div v-if="hasBuildingBlocks" class="building-blocks">
      <div class="title">Building Blocks</div>
      <hr />
      <NodeList
        v-if="hasNodeTemplates"
        :nodes="nodeTemplates"
        class="node-list"
      >
        <template #item="slotProps">
          <DraggableNodeTemplate v-bind="slotProps" />
        </template>
      </NodeList>
      <div v-if="hasUninstalledExtensions" class="installable-extensions">
        <InstallableExtension
          v-for="(extension, featureSymbolicName) in uninstalledExtensions"
          v-bind="extension"
          :key="featureSymbolicName"
        />
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
  & .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;

    & .icon {
      background-color: var(--knime-white);
      border: 1px solid var(--knime-silver-sand);
      border-radius: 100%;
      height: 26px;
      width: 26px;
      display: flex;
      justify-content: center;
      align-items: center;

      & svg {
        @mixin svg-icon-size 18;
      }

      & svg.assistant {
        margin-top: -4px;

        @mixin svg-icon-size 16;
      }
    }

    & .name {
      color: var(--knime-dove-gray);
      font-size: 14px;
      font-weight: bold;
    }
  }

  & .content {
    padding: 10px 2px;
    overflow: hidden;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    font-size: 16px;
    line-height: 18.4px;

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

    & .references {
      padding-top: 13px;

      & svg {
        margin-right: 3px;

        @mixin svg-icon-size 10;
      }

      & .ref-button {
        padding: 0;
        font-size: 12px;
      }
    }
  }

  & .building-blocks {
    margin-top: 4px;

    & .title {
      font-weight: 600;
    }

    & .node-list {
      margin-top: 10px;
      margin-bottom: 13px;
    }

    & hr {
      margin-top: 2px;
      margin-bottom: 0;
      border: none;
      border-top: 1px solid var(--knime-silver-sand);
    }

    & .installable-extensions {
      margin-top: 10px;
      padding-bottom: 10px;
    }
  }

  & .status-update {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 0 5px 5px;
    font-size: 14px;

    & svg.loading-icon {
      animation: rotate-animation 2s linear infinite;

      @mixin svg-icon-size 14;
    }
  }
}
</style>
