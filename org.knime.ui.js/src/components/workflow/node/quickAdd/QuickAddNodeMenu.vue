<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapActions, mapGetters, mapState } from 'vuex';

import type { NodePort, XY } from '@/api/gateway-api/generated-api';
import type { DragConnector } from '@/components/workflow/ports/NodePort/types';

import FloatingMenu from '@/components/common/FloatingMenu.vue';
import SearchBar from '@/components/common/SearchBar.vue';

import { checkPortCompatibility } from '@/util/compatibleConnections';
import { portPositions } from '@/util/portShift';

import NodePortActiveConnector from '@/components/workflow/ports/NodePort/NodePortActiveConnector.vue';
import QuickAddNodeSearchResults from './QuickAddNodeSearchResults.vue';
import QuickAddNodeRecommendations from './QuickAddNodeRecommendations.vue';
import QuickAddNodeDisabledWorkflowCoach from './QuickAddNodeDisabledWorkflowCoach.vue';

const calculatePortOffset = ({ targetPorts, sourcePort, availablePortTypes }) => {
    const targetPortIndex = targetPorts.findIndex(toPort => checkPortCompatibility({
        fromPort: sourcePort,
        toPort,
        availablePortTypes
    }));

    const portCount = targetPorts.length + 1; // +1 for the mickey mouse port
    const positions = portPositions({ portCount });

    if (targetPortIndex === -1 && sourcePort.index === 0) {
        // will be a mickey mouse to mickey mouse flow port connection
        // NOTE: the index 0 is always the red mickey mouse port for nodes that
        // are on the workflow, NOT for them in the repo! They lack those ports completely.
        // TODO: fix the inconsistency with NXT-1489
        return positions[0];
    } else {
        return positions[targetPortIndex + 1];
    }
};

/*
 * Quick Add Node Menu: Shows a menu with recommended nodes that are provided by the api (based on usage statistics).
 * This component fetches, displays and adds them to the workflow.
 */
export default defineComponent({
    components: {
        QuickAddNodeDisabledWorkflowCoach,
        QuickAddNodeRecommendations,
        QuickAddNodeSearchResults,
        SearchBar,
        NodePortActiveConnector,
        FloatingMenu
    },
    props: {
        nodeId: {
            type: [String, null] as PropType<string | null>,
            default: null
        },
        position: {
            type: Object as PropType<XY>,
            required: true
        },
        port: {
            type: [Object, null] as PropType<NodePort | null>,
            default: null
        }
    },
    emits: ['menuClose'],
    data() {
        return {
            // we keep the query local to debounce the update in the store, see watcher
            searchQuery: '',
            selectedNode: null
        };
    },
    computed: {
        ...mapState('application', ['hasNodeRecommendationsEnabled', 'hasNodeCollectionActive', 'availablePortTypes']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('quickAddNodes', ['recommendedNodes']),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('quickAddNodes', ['searchIsActive', 'getFirstResult']),

        canvasPosition() {
            let pos = { ...this.position };
            const halfPort = this.$shapes.portSize / 2;

            // x: align with the port arrow (position is the center of the port)
            // assume direction == out
            pos.x += halfPort;

            return pos;
        },
        fakePortConnector() : DragConnector {
            return {
                id: `quick-add-${this.nodeId}-${this.portIndex}`,
                flowVariableConnection: this.portIndex === 0,
                absolutePoint: [this.position.x, this.position.y],
                allowedActions: { canDelete: false },
                interactive: false,
                sourceNode: this.nodeId,
                sourcePort: this.portIndex
            };
        },
        marginTop() {
            const ghostSizeZoomed = this.$shapes.addNodeGhostSize * this.zoomFactor;
            // eslint-disable-next-line no-magic-numbers
            const extraMargin = Math.log(ghostSizeZoomed) / 1.1;
            // eslint-disable-next-line no-magic-numbers
            const marginTop = ghostSizeZoomed / 2 + extraMargin + 3;

            return `${marginTop}px`;
        },
        portIndex() {
            // we need this to be explicit null if no port is given for the api to work
            // falsy will not work as the index can be 0 (which is falsy)
            return this.port ? this.port.index : null;
        }
    },
    watch: {
        searchQuery(newQuery) {
            this.$store.dispatch('quickAddNodes/updateQuery', newQuery);
        },
        hasNodeRecommendationsEnabled: {
            immediate: true,
            handler() {
                if (this.hasNodeRecommendationsEnabled) {
                    this.fetchNodeRecommendations();
                }
            }
        },
        async port(newPort, oldPort) {
            if (newPort?.index !== oldPort?.index) {
                // reset search on index switch (this is a common operation via the keyboard shortcut CTRL+.)
                this.clearSearchParams();
                // update type id for next search (if one was active it got reset by index change)
                // this needs to be done in all cases as clearSearchParams resets it
                this.$store.commit('quickAddNodes/setPortTypeId', newPort.typeId);
                // fetch new recommendations
                await this.fetchNodeRecommendations();
            }
        }
    },
    mounted() {
        if (this.port) {
            this.$store.commit('quickAddNodes/setPortTypeId', this.port.typeId);
        }
        // eslint-disable-next-line no-extra-parens
        (this.$refs.search as HTMLElement)?.focus();
    },
    beforeUnmount() {
        this.$store.dispatch('quickAddNodes/clearRecommendedNodesAndSearchParams');
    },
    methods: {
        ...mapActions('workflow', { addNodeToWorkflow: 'addNode' }),
        ...mapActions('quickAddNodes', [
            'searchTopNodesNextPage', 'searchBottomNodesNextPage', 'toggleShowingBottomNodes'
        ]),
        async clearSearchParams() {
            this.searchQuery = '';
            await this.$store.dispatch('quickAddNodes/clearSearchParams');
        },
        async fetchNodeRecommendations() {
            const { nodeId, portIndex: portIdx } = this;
            await this.$store.dispatch('quickAddNodes/getNodeRecommendations', { nodeId, portIdx });
        },

        async addNode(nodeTemplate) {
            if (!this.isWritable || nodeTemplate === null) {
                return;
            }

            const { nodeFactory, inPorts } = nodeTemplate;

            const [offsetX, offsetY] = this.port
                ? calculatePortOffset({
                    targetPorts: inPorts,
                    sourcePort: this.port,
                    availablePortTypes: this.availablePortTypes
                })
                : [0, 0];

            // add node
            const { canvasPosition: { x, y } } = this;
            await this.$store.dispatch('workflow/addNode', {
                position: {
                    x: x - offsetX,
                    y: y - offsetY
                },
                nodeFactory,
                sourceNodeId: this.nodeId,
                sourcePortIdx: this.portIndex
            });

            this.$emit('menuClose');
        },
        searchEnterKey() {
            this.addNode(this.getFirstResult());
        },
        searchDownKey() {
            // @ts-ignore
            this.$refs.recommendationResults?.focusFirst();
            // @ts-ignore
            this.$refs.searchResults?.focusFirst();
        },
        searchHandleShortcuts(e : KeyboardEvent) {
            // bypass disabled shortcuts for <input> elements only for the quick add node
            let shortcut = this.$shortcuts.findByHotkey(e);
            if (shortcut === 'quickAddNode' && this.$shortcuts.isEnabled(shortcut)) {
                this.$shortcuts.dispatch(shortcut);
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
});
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    aria-label="Quick add node"
    :prevent-oveflow="true"
    @menu-close="$emit('menuClose')"
  >
    <!-- this will be portalled to the canvas -->
    <NodePortActiveConnector
      :port="port"
      :targeted="false"
      direction="out"
      :drag-connector="fakePortConnector"
      :did-drag-to-compatible-target="false"
      :disable-quick-node-add="false"
    />
    <div class="wrapper">
      <div class="header">
        <SearchBar
          ref="search"
          v-model="searchQuery"
          placeholder="Search all compatible nodes"
          class="search-bar"
          tabindex="-1"
          @focusin="selectedNode = null"
          @keydown.enter.prevent.stop="searchEnterKey"
          @keydown.down.prevent.stop="searchDownKey"
          @keydown="searchHandleShortcuts"
        />
        <hr>
      </div>
      <QuickAddNodeDisabledWorkflowCoach
        v-if="!hasNodeRecommendationsEnabled && !searchIsActive"
      />
      <template
        v-else
      >
        <QuickAddNodeSearchResults
          v-if="searchIsActive"
          ref="searchResults"
          v-model:selected-node="selectedNode"
          @nav-reached-top="($refs.search as any).focus()"
          @add-node="addNode($event)"
        />
        <QuickAddNodeRecommendations
          v-else
          ref="recommendationResults"
          v-model:selected-node="selectedNode"
          @nav-reached-top="($refs.search as any).focus()"
          @add-node="addNode($event)"
        />
      </template>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.quick-add-node {
  --quick-add-node-height: 450;
  --quick-add-node-header-height: 73;

  width: 345px;
  margin-top: v-bind('marginTop');

  & .wrapper {
    height: calc(var(--quick-add-node-height) * 1px);
    box-shadow: 0 1px 6px 0 var(--knime-gray-dark-semi);
    background: var(--knime-gray-ultra-light);
    display: flex;
    flex-direction: column;
  }

  &:focus {
    outline: none;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }

  & .header {
    height: calc(var(--quick-add-node-header-height) * 1px);
    padding: 15px 15px 5px;

    & hr {
      margin: 10px 0;
    }
  }

  /* set margin on all three lists of nodes (2x search, 1x recommendation) */
  & :deep(ul.nodes) {
    margin-left: 15px;
    margin-right: 15px;
  }

  /* remove default styles of search results */
  & :deep(.more-nodes-button) {
    background: transparent;
  }

  & :deep(.results) {
    background: transparent;
    max-height: calc(calc(var(--quick-add-node-height) - var(--quick-add-node-header-height)) * 1px);

    & .content {
      padding: 0;
    }
  }

  & .search-bar {
    font-family: "Roboto Condensed", sans-serif;
    height: 40px;
    font-size: 17px;

    &:hover {
      background-color: var(--knime-silver-sand-semi);
    }

    &:focus-within {
      background-color: var(--knime-white);
      border-color: var(--knime-masala);
    }
  }
}
</style>
