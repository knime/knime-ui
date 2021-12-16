<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { portBar, connectorPosition } from '~/mixins';
import connectorPath from '~/util/connectorPath';
import gsap from 'gsap';

/**
 * A curved line, connecting one node's output with another node's input port.
 * Must be embedded in an `<svg>` element.
 * Uses the connectorPosition mixin to get the start and end position of the connector.
 */
export default {
    mixins: [portBar, connectorPosition],
    inheritAttrs: false,
    props: {
        /**
         * Determines whether this connector is streamed at the moment
         */
        streaming: { type: Boolean, default: false },

        /**
         * Determines whether this connector is rendered in alternative color
         */
        flowVariableConnection: { type: Boolean, default: false },

        /**
         * Connector id
         */
        id: {
            type: String,
            required: true
        },
        allowedActions: {
            type: Object,
            required: true,
            validate(o) {
                return o.hasOwnProperty('canDelete');
            }
        }
    },
    data: () => ({
        suggestDelete: false
    }),
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow',
            isDragging: 'isDragging',
            deltaMovePosition: 'deltaMovePosition',
            moveNodeGhostThresholdExceeded: 'moveNodeGhostThresholdExceeded'
        }),
        ...mapGetters('workflow', {
            isWorkflowWritable: 'isWritable'
        }),
        ...mapGetters('selection', ['isConnectionSelected', 'isNodeSelected']),
        path() {
            let { start: [x1, y1], end: [x2, y2] } = this;
            // Update position of source or destination node is being moved
            if (this.isDragging && !this.moveNodeGhostThresholdExceeded) {
                if (this.isNodeSelected(this.sourceNode)) {
                    x1 += this.deltaMovePosition.x;
                    y1 += this.deltaMovePosition.y;
                }
                if (this.isNodeSelected(this.destNode)) {
                    x2 += this.deltaMovePosition.x;
                    y2 += this.deltaMovePosition.y;
                }
            }
            
            return connectorPath(x1, y1, x2, y2);
        },
        strokeColor() {
            if (this.flowVariableConnection) {
                return this.$colors.connectorColors.flowVariable;
            }
            return this.$colors.connectorColors.default;
        }
    },
    watch: {
        /*
         * if suggestDelete changes to 'true' the connector will animate away from its target port
         * if suggestDelete changes back to 'false' the connector will move back
         */
        suggestDelete(newValue, oldValue) {
            if (newValue && !oldValue) {
                const shiftX = -12;
                const shiftY = -6;
                let { start: [x1, y1], end: [x2, y2] } = this;
                let newPath = connectorPath(x1, y1, x2 + shiftX, y2 + shiftY);

                gsap.to(this.$refs.visiblePath, {
                    attr: { d: newPath },
                    duration: 0.2,
                    ease: 'power2.out'
                });
            } else if (!newValue && oldValue) {
                gsap.to(this.$refs.visiblePath, {
                    attr: { d: this.path },
                    duration: 0.2,
                    ease: 'power2.out'
                });
            }
        }
    },
    methods: {
        ...mapActions('selection', ['selectConnection', 'deselectConnection', 'deselectAllObjects']),
        onLeftMouseClick(e) {
            if (e.shiftKey) {
                // Multi select
                if (this.isConnectionSelected(this.id)) {
                    this.deselectConnection(this.id);
                } else {
                    this.selectConnection(this.id);
                }
            } else {
                // Single select
                this.deselectAllObjects();
                this.selectConnection(this.id);
            }
        },
        onContextMenu() {
            this.deselectAllObjects();
            this.selectConnection(this.id);
        },
        onIndicateReplacement({ detail: { state } }) {
            if (this.suggestDelete !== 'locked') {
                // update state according to event if not already 'locked'
                // this is used to make sure the connector doesn't snap back to its port after 'connecting phase' is over
                this.suggestDelete = state;
            }
          
            if (state) {
                this.$root.$on('connector-dropped', this.onConnectorDropped);
            } else {
                this.$root.$off('connector-dropped', this.onConnectorDropped);
            }
        },
        onConnectorDropped() {
            // lock this connector in place to prevent it from jumping back before being removed
            this.suggestDelete = 'locked';
        }
    }
};
</script>

<template>
  <g
    :data-connector-id="id"
    @indicate-replacement.stop="onIndicateReplacement"
  >
    <path
      :d="path"
      class="hover-area"
      @click.left="onLeftMouseClick"
      @contextmenu.prevent="onContextMenu"
    />
    <path
      ref="visiblePath"
      :d="path"
      :stroke="strokeColor"
      :stroke-width="$shapes.connectorWidth"
      :class="{
        'flow-variable': flowVariableConnection,
        'read-only': !isWorkflowWritable,
        dashed: streaming,
        selected: isConnectionSelected(id) && !isDragging
      }"
      :data-test-source-node="sourceNode"
      :data-test-dest-node="destNode"
      fill="none"
    />
  </g>
</template>

<style lang="postcss" scoped>
@keyframes dash {
  from {
    stroke-dashoffset: 100;
  }

  to {
    stroke-dashoffset: 0;
  }
}

path:not(.hover-area) {
  pointer-events: none;
  stroke-width: 1;
  stroke: var(--knime-stone-gray);
  transition:
    stroke-width 0.1s ease-in,
    stroke 0.1s ease-in;

  &:not(.read-only) {
    cursor: grab;
  }

  &.selected {
    stroke-width: 3;
    stroke: var(--knime-cornflower);
  }

  &.dashed {
    stroke-dasharray: 5;
    stroke-dashoffset: 50;
    animation: dash 3s linear infinite;
  }

  &.flow-variable {
    stroke: var(--knime-coral);

    &.selected {
      stroke: var(--knime-cornflower);
    }
  }
}

.hover-area {
  stroke: transparent;
  stroke-width: 8px;
  fill: none;

  &:hover + path {
    stroke-width: 3;
  }
}
</style>
