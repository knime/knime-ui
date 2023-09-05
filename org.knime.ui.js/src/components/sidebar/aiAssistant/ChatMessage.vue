<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useStore } from "vuex";

import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import LoadingIcon from "webapps-common/ui/assets/img/icons/reload.svg";

import NodeList from "@/components/nodeRepository/NodeList.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import InstallableExtension from "./InstallableExtension.vue";
import type { NodeWithExtensionInfo } from "./types";

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

const nodeTemplates = ref([]);
const uninstalledExtensions = ref({});

const store = useStore();

watchEffect(async () => {
  if (props.role !== "assistant") {
    return;
  }

  // These are the nodes that are already installed.
  nodeTemplates.value = [];
  // These are the extensions of nodes that are not installed yet.
  uninstalledExtensions.value = {};
  // Both are populated asynchronously here.
  await Promise.all(
    props.nodes.map(async (node) => {
      const { factoryName } = node;
      // Try to fetch node from store.
      const nodeTemplate = await store.dispatch(
        "nodeRepository/getNodeTemplate",
        factoryName,
      );

      if (nodeTemplate) {
        // Node exists in store and is already installed.
        nodeTemplates.value.push(nodeTemplate);
      } else {
        // Node does not exist in store and is not installed yet.

        // Add extension to list of uninstalled extensions.
        let extension = uninstalledExtensions.value[node.featureSymbolicName];
        if (!extension) {
          extension = {
            featureSymbolicName: node.featureSymbolicName,
            featureName: node.featureName,
            featureVendor: node.featureVendor,
            nodes: [],
          };
          uninstalledExtensions.value[node.featureSymbolicName] = extension;
        }

        // Add node to extension.
        extension.nodes.push({
          factoryName: node.factoryName,
          title: node.title,
        });
      }
    }),
  );
});

const isUser = computed(() => props.role === "user");
const isAssistant = computed(() => props.role === "assistant");
const hasReferences = computed(
  () => props.references && Object.keys(props.references).length > 0,
);
</script>

<template>
  <div class="chat-message">
    <div class="content" :class="{ user: isUser }">
      <div class="icon" :class="{ assistant: isAssistant }">
        <UserIcon v-if="isUser" />
        <KnimeIcon v-else />
      </div>
      <div class="container">
        <!-- eslint-disable vue/no-v-html  -->
        <div v-if="content" :class="{ error: isError }" v-html="content" />
        <div v-else>
          <div class="placeholder" />
          <div class="placeholder" />
        </div>
        <div v-if="hasReferences" class="references">
          <div
            v-for="(urls, reference_name) in references"
            :key="reference_name"
          >
            <span class="reference-name">{{ reference_name }}</span
            >:
            <template v-for="(url, index) in urls" :key="url">
              <a :href="url"> [{{ index + 1 }}] </a>
              <span v-if="index < Object.keys(urls).length - 1">, </span>
            </template>
          </div>
        </div>
      </div>
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
    <div v-if="Object.keys(uninstalledExtensions).length">
      <InstallableExtension
        v-for="(extension, featureSymbolicName) in uninstalledExtensions"
        v-bind="extension"
        :key="featureSymbolicName"
      />
    </div>
    <hr />
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

      & .references {
        padding-top: 15px;

        & .reference-name {
          font-weight: bold;
        }

        & a {
          text-decoration: none;
        }
      }
    }
  }

  & .node-list {
    margin-top: 13px;
    margin-bottom: 13px;
  }

  & hr {
    margin: 0;
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
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
