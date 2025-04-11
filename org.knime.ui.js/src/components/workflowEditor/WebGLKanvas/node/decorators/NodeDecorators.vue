<script setup lang="ts">
import { computed } from "vue";

import type {
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";

import LinkDecorator from "./LinkDecorator.vue";
import LockDecorator from "./LockDecorator.vue";
import LoopDecorator from "./LoopDecorator.vue";
import ReexecutionDecorator from "./ReexecutionDecorator.vue";
import StreamingDecorator from "./StreamingDecorator.vue";

defineOptions({
  inheritAttrs: false,
});

type Props = {
  /**
   * Node type, e.g. "Learner", "Visualizer"
   */
  type?: NativeNodeInvariants.TypeEnum | null;

  /**
   * TemplateLink object containing the link URL and updateStatus
   */
  link?: { url?: string; updateStatus?: string } | null;

  /**
   * Node variation.
   */
  kind: Node.KindEnum;

  /**
   * Information about the node execution. Might not be present if no special node execution info is available
   */
  executionInfo?: Record<string, any> | null;

  /**
   * Loop specific configuration options
   */
  loopInfo?: {
    allowedActions?: {
      canResume?: boolean;
      canStep?: boolean;
      canPause?: boolean;
    };
    status?: string;
  };

  isReexecutable?: boolean;
  isLocked?: boolean | null;
};
const props = withDefaults(defineProps<Props>(), {
  type: null,
  link: null,
  executionInfo: null,
  loopInfo: () => ({
    allowedActions: {},
  }),
  isReexecutable: false,
  isLocked: null,
});

const decoratorBackgroundType = computed(() => {
  // use type or kind and uppercase first letter (metanode or component)
  return (props.type ||
    props.kind[0].toUpperCase() +
      props.kind.substring(1)) as keyof typeof $colors.nodeBackgroundColors;
});
</script>

<template>
  <Container>
    <LinkDecorator
      v-if="link?.url"
      position-x="0"
      position-y="21"
      :background-type="decoratorBackgroundType"
      :update-status="link.updateStatus!"
    />

    <!-- Nodes contained in a component with a Streaming Job Manager get a little arrow or "x" to indicate their
        compatibility. Components with a Streaming Job Manager also get a little arrow.
        In both cases, the backend sets the `executionInfo` attribute. -->
    <StreamingDecorator
      v-if="executionInfo"
      position-x="21"
      position-y="21"
      :background-type="decoratorBackgroundType"
      :execution-info="executionInfo"
    />

    <ReexecutionDecorator
      v-if="isReexecutable"
      position-x="20"
      position-y="0"
      :background-type="decoratorBackgroundType"
    />

    <LoopDecorator
      v-if="type === 'LoopStart' || type === 'LoopEnd'"
      position-x="20"
      position-y="20"
      :loop-status="loopInfo?.status"
    />

    <LockDecorator
      v-if="isLocked !== null"
      position-x="22"
      position-y="1"
      :is-locked="isLocked!"
      :background-type="decoratorBackgroundType"
    />
  </Container>
</template>
