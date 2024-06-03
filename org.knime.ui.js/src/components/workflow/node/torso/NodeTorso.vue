<script>
import { mapGetters } from "vuex";

import NodeTorsoNormal from "webapps-common/ui/components/node/NodeTorsoNormal.vue";
import NodeTorsoMissing from "./NodeTorsoMissing.vue";
import NodeTorsoUnknown from "./NodeTorsoUnknown.vue";
import NodeTorsoMetanode from "./NodeTorsoMetanode.vue";
import NodeTorsoReplace from "./NodeTorsoReplace.vue";
import NodeTorsoForbidden from "./NodeTorsoForbidden.vue";

/**
 * Main part of the node icon.
 * Mostly a rounded square (or for some special nodes like loop nodes, a dedicated shape).
 * Must be embedded in an <svg> element.
 */
export default {
  components: {
    NodeTorsoMissing,
    NodeTorsoMetanode,
    NodeTorsoUnknown,
    NodeTorsoNormal,
    NodeTorsoReplace,
    NodeTorsoForbidden,
  },
  props: {
    /**
     * Node type, e.g. "Learner", "Visualizer"
     * Is undefined for MetaNodes
     */
    type: { type: String, default: null },

    /**
     * Node variation.
     * @values 'node', 'metanode', 'component'
     */
    kind: {
      type: String,
      required: true,
      validator: (kind) => ["node", "metanode", "component"].includes(kind),
    },
    /**
     * data-url containing Base64-encoded icon. Passed through to NodeTorsoNormal
     */
    icon: {
      type: String,
      default: null,
      validator: (url) => url.startsWith("data:image/"),
    },
    /**
     * Execution state (only for meta nodes). Passed through to NodeTorsoMetanode
     */
    executionState: {
      type: String,
      default: null,
    },
    isDraggedOver: {
      type: Boolean,
      defaut: false,
    },
  },
  computed: {
    ...mapGetters("workflow", ["isWritable"]),
    // Returns false for broken nodes, which can occur during development, but should not occur in production.
    isKnownNode() {
      if (this.kind === "component") {
        return (
          !this.type ||
          Reflect.has(this.$colors.nodeBackgroundColors, this.type)
        );
      }
      return (
        this.kind === "metanode" ||
        Reflect.has(this.$colors.nodeBackgroundColors, this.type)
      );
    },
  },
};
</script>

<template>
  <g>
    <NodeTorsoMissing v-if="type === 'Missing'" />
    <NodeTorsoForbidden v-if="type === 'Forbidden'" />
    <NodeTorsoMetanode
      v-else-if="kind === 'metanode'"
      :execution-state="executionState"
    />
    <NodeTorsoNormal
      v-else-if="isKnownNode"
      :is-component="kind === 'component'"
      :icon="icon"
      :type="type"
    />
    <NodeTorsoUnknown v-else />
    <!-- Not using conditional rendering, DOM modifications will trigger DragLeave event -->
    <NodeTorsoReplace :is-dragged-over="isDraggedOver" />
  </g>
</template>
