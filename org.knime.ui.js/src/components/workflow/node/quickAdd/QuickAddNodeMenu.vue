<script>
import { mapActions, mapGetters, mapState } from 'vuex';
import { flatten } from 'lodash';

import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

const MAX_NODES = 12;

export default {
    components: {
        NodePreview,
        FloatingMenu
    },
    props: {
        /** direction of the start port where the connector was dragged away from */
        direction: {
            type: String,
            required: true,
            validator: (t) => ['in', 'out'].includes(t)
        },
        nodeId: {
            type: String,
            required: true
        },
        position: {
            type: Object,
            required: true,
            validator: ({ x, y }) => typeof x === 'number' && typeof y === 'number'
        },
        port: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            searchQuery: ''
        };
    },
    computed: {
        ...mapState('nodeRepository', ['nodesPerCategory']),
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('workflow', ['isWritable']),
        nodes() {
            // TODO: replace this with the suggested nodes API call (NXT-1206)
            const filterPorts = (ports) => {
                let flowVarType = 'org.knime.core.node.port.flowvariable.FlowVariablePortObject';
                return ports.filter(p => p.typeId !== flowVarType);
            };
            let result = flatten(this.nodesPerCategory.map(category => category.nodes));
            // filter nodes by in/out ports; ignore flow vars
            if (this.port.side === 'in') {
                result = result.filter(n => filterPorts(n.outPorts).length > 0);
            } else {
                result = result.filter(n => filterPorts(n.inPorts).length > 0);
            }
            return result.slice(0, MAX_NODES);
        },
        canvasPosition() {
            let pos = { ...this.position };
            const halfPort = this.$shapes.portSize / 2;

            // x: align with the arrow (position seems to be the center of the port)
            if (this.direction === 'out') {
                pos.x += halfPort;
            } else {
                pos.x -= halfPort;
            }
            return pos;
        },
        ghostSizeZoomed() {
            return this.$shapes.addNodeGhostSize * this.zoomFactor;
        }
    },
    mounted() {
        // we currently just get some nodes, this should be done via a new endpoint
        if (!this.nodesPerCategory.length) {
            this.$store.dispatch('nodeRepository/getAllNodes', { append: false });
        }
    },
    methods: {
        ...mapActions('workflow', { addNodeToWorkflow: 'addNode' }),
        async addNode({ nodeFactory }) {
            if (!this.isWritable) {
                return; // end here
            }

            // add node
            const { position } = this;
            await this.addNodeToWorkflow({
                position,
                nodeFactory,
                sourceNodeId: this.nodeId,
                sourcePortIdx: this.port.index
            });

            this.$emit('menu-close');
        }
    }
};
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    :anchor="direction === 'in' ? 'top-right' : 'top-left'"
    :style="`--ghost-size: ${ghostSizeZoomed}; --extra-margin: ${Math.log(ghostSizeZoomed) / 1.1}`"
    aria-label="Quick add node"
    prevent-overflow
    tabindex="0"
    @menu-close="$emit('menu-close')"
  >
    <div class="wrapper">
      <section
        class="results"
      >
        <div class="content">
          <ul class="nodes">
            <li
              v-for="node in nodes"
              :key="node.id"
            >
              <div
                class="node"
                tabindex="0"
                @keydown.enter.stop.prevent="addNode(node, $event)"
                @click="addNode(node, $event)"
              >
                <label :title="node.name">{{ node.name }}</label>
                <NodePreview
                  class="node-preview"
                  :type="node.type"
                  :in-ports="node.inPorts"
                  :out-ports="node.outPorts"
                  :icon="node.icon"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.quick-add-node {
  width: 330px;
  margin-top: calc(var(--ghost-size) / 2 * 1px  + var(--extra-margin) * 1px + 3px);

  & .wrapper {
    box-shadow: 0 1px 6px 0 var(--knime-gray-dark-semi);
    background: var(--knime-gray-ultra-light);
    padding: 0.5em 0;
  }

  &:focus {
    outline: none;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand)
  }

  & .results {
    overflow-y: auto;
    max-height: calc(100% - 50px);
    padding-top: 0.5em;

    & .content {
      padding: 0 10px 15px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
  }

  & .nodes {
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    margin: 0 -5px;
    list-style-type: none;

    & .node {
      width: 100px;
      height: 78px;
      margin: 0 2px;
      padding-bottom: 47px;
      position: relative;
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      text-align: center;

      & label {
        max-height: 26px;
        max-width: 90px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        pointer-events: none;
      }

      & .node-preview {
        padding-bottom: 6px;
      }

      & svg {
        width: 70px;
        position: absolute;
        bottom: -15px;
        right: 15px;
      }

      &:hover {
        cursor: pointer;

        & .node-preview {
          filter: url(#node-torso-shadow);
        }
      }

      &:focus {
        outline: 0;
        /* outline with border-radius is not working properly in Safari and CEF */
        box-shadow: 0 0 0 calc(var(--selected-node-stroke-width-shape) * 1px) var(--selection-active-border-color);
        border-radius: calc(var(--selected-node-border-radius-shape) * 1px);
        background-color: var(--selection-active-background-color);
      }
    }
  }
}
</style>
