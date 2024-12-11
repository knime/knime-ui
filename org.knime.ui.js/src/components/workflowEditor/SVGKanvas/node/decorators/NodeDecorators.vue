<script>
import LinkDecorator from "./LinkDecorator.vue";
import LockDecorator from "./LockDecorator.vue";
import LoopDecorator from "./LoopDecorator.vue";
import ReexecutionDecorator from "./ReexecutionDecorator.vue";
import StreamingDecorator from "./StreamingDecorator.vue";

/** A component used to render all different decorators a node can show */
export default {
  components: {
    LinkDecorator,
    StreamingDecorator,
    LoopDecorator,
    ReexecutionDecorator,
    LockDecorator,
  },
  inheritAttrs: false,
  props: {
    /**
     * Node type, e.g. "Learner", "Visualizer"
     */
    type: {
      type: String,
      default: null,
    },

    /**
     * TemplateLink object containing the link URL and updateStatus
     */
    link: {
      type: Object,
      default: null,
    },

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
     *  Information about the node execution. Might not be present if no special node execution info is available
     *  If given, usually only one of the following properties is set, either the icon, the 'streamble'-flag, or the
     *  jobManager
     */
    executionInfo: {
      type: Object,
      default: null,
    },

    /**
     *  Loop specific configuration options
     *  @example:
     *    {
     *      allowedActions: {
     *        canResume: true,
     *        canStep: true,
     *        canPause: false
     *      },
     *      status: 'PAUSED'
     *    }
     */
    loopInfo: {
      type: Object,
      default: () => ({
        allowedActions: {},
      }),
    },

    isReexecutable: {
      type: Boolean,
      default: false,
    },

    isLocked: {
      type: Boolean,
      default: null,
    },
  },
  computed: {
    decoratorBackgroundType() {
      // use type or kind and uppercase first letter (metanode or component)
      return this.type || this.kind[0].toUpperCase() + this.kind.substring(1);
    },
  },
};
</script>

<template>
  <g>
    <LinkDecorator
      v-if="link?.url"
      :background-type="decoratorBackgroundType"
      :update-status="link.updateStatus"
      transform="translate(0, 21)"
    />

    <!-- Nodes contained in a component with a Streaming Job Manager get a little arrow or "x" to indicate their
        compatibility. Components with a Streaming Job Manager also get a little arrow.
        In both cases, the backend sets the `executionInfo` attribute. -->
    <StreamingDecorator
      v-if="executionInfo"
      :background-type="decoratorBackgroundType"
      :execution-info="executionInfo"
      transform="translate(21, 21)"
    />

    <ReexecutionDecorator
      v-if="isReexecutable"
      :background-type="decoratorBackgroundType"
      transform="translate(20, 0)"
    />

    <LoopDecorator
      v-if="type === 'LoopStart' || type === 'LoopEnd'"
      :loop-status="loopInfo.status"
      transform="translate(20, 20)"
    />

    <LockDecorator
      v-if="isLocked !== null"
      :is-locked="isLocked"
      :background-type="decoratorBackgroundType"
      transform="translate(22, 1)"
    />
  </g>
</template>
