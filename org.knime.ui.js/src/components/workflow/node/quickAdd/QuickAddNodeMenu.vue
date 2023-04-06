<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapActions, mapGetters, mapState } from 'vuex';

import { API } from '@api';
import type { NodePort, XY } from '@/api/gateway-api/generated-api';
import type { DragConnector } from '@/components/workflow/ports/NodePort/types';

import Button from 'webapps-common/ui/components/Button.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import SearchBar from '@/components/common/SearchBar.vue';

import { checkPortCompatibility } from '@/util/compatibleConnections';
import { portPositions } from '@/util/portShift';

import { debounce } from 'lodash';
import NodeList from '@/components/nodeRepository/NodeList.vue';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';
import NodePortActiveConnector from '@/components/workflow/ports/NodePort/NodePortActiveConnector.vue';
import QuickAddNodeSearchResults from "@/components/workflow/node/quickAdd/QuickAddNodeSearchResults.vue";

const SEARCH_COOLDOWN = 150; // ms

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
        QuickAddNodeSearchResults,
        NodeList,
        NodeTemplate,
        SearchBar,
        Button,
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
            selectedNode: null
        };
    },
    computed: {
        ...mapState('application', ['hasNodeRecommendationsEnabled', 'hasNodeCollectionActive', 'availablePortTypes']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('quickAddNodes', ['recommendedNodes']),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('quickAddNodes', ['searchIsActive', 'getFirstResult', 'hasRecommendations']),

        searchQuery: {
            get() {
                return this.$store.state.quickAddNodes.query;
            },
            set: debounce(function (this: any, value) {
                this.$store.dispatch('quickAddNodes/updateQuery', value); // eslint-disable-line no-invalid-this
            },
            SEARCH_COOLDOWN, { leading: true, trailing: true })
        },
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
        ghostSizeZoomed() {
            return this.$shapes.addNodeGhostSize * this.zoomFactor;
        },
        extraMargin() {
            // eslint-disable-next-line no-magic-numbers
            return Math.log(this.ghostSizeZoomed) / 1.1;
        },
        searchActions() {
            return {
                searchTopNodesNextPage: this.searchTopNodesNextPage,
                searchBottomNodesNextPage: this.searchBottomNodesNextPage,
                toggleShowingBottomNodes: this.toggleShowingBottomNodes
            };
        },
        portIndex() {
            // we need this to be explicit null if no port is given for the api to work
            // falsy will not work as the index can be 0 (which is falsy)
            return this.port ? this.port.index : null;
        }
    },
    watch: {
        hasNodeRecommendationsEnabled: {
            immediate: true,
            handler() {
                if (this.hasNodeRecommendationsEnabled) {
                    this.fetchNodeRecommendations();
                }
            }
        },
        nodeId() {
            this.fetchNodeRecommendations();
        },
        port(newPort, oldPort) {
            if (newPort?.index !== oldPort?.index) {
                // reset search on index toggle and fetch recommended
                this.searchQuery = '';
                this.fetchNodeRecommendations();
            }
            if (newPort?.typeId !== oldPort?.typeId) {
                this.$store.commit('quickAddNodes/setPortTypeId', newPort.typeId);
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
        openWorkflowCoachPreferencePage() {
            API.desktop.openWorkflowCoachPreferencePage();
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
    <!-- this will be portaled to the canvas -->
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
      <div
        v-if="!hasNodeRecommendationsEnabled && !searchIsActive"
        class="disabled-workflow-coach"
      >
        <h2>Workflow coach</h2>
        <span>
          The workflow coach will help you build workflows more efficiently by suggesting the next node for your
          workflow.
        </span>
        <span>
          To activate this function you need to change the settings inside the preference page.
        </span>
        <Button
          primary
          class="button"
          @click="openWorkflowCoachPreferencePage"
        >
          Open Preferences
        </Button>
      </div>
      <template
        v-else
      >
        <div v-if="searchIsActive">
          <QuickAddNodeSearchResults
            ref="searchResults"
            v-model:selected-node="selectedNode"
            @nav-reached-top="($refs.search as any).focus()"
            @add-node="addNode($event)"
          />
        </div>
        <div
          v-else
          class="recommendations"
        >
          <NodeList
            v-if="hasRecommendations"
            ref="recommendationResults"
            v-model:selected-node="selectedNode"
            class="top-list"
            :nodes="recommendedNodes"
            @nav-reached-top="($refs.search as any).focus()"
            @enter-key="addNode($event)"
          >
            <template #item="itemProps">
              <NodeTemplate
                v-bind="itemProps"
                @click="addNode(itemProps.nodeTemplate)"
              />
            </template>
          </NodeList>
          <span
            v-else
            class="placeholder no-recommendations"
          >
            The Workflow Coach cannot recommend any nodes to you yet.
          </span>
        </div>
      </template>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.quick-add-node {
  --quick-add-node-height: 450;
  --quick-add-node-header-height: 73;

  width: 345px;
  margin-top: calc(v-bind("ghostSizeZoomed") / 2 * 1px + v-bind("extraMargin") * 1px + 3px);

  & .disabled-workflow-coach {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-content: center;
    justify-content: center;
    width: 100%;
    flex: 1;
    padding: 20px;
    background: var(--knime-black-semi);
    color: var(--knime-white);
    font-family: "Roboto Condensed", sans-serif;

    & h2 {
      font-size: 18px;
      line-height: 21px;
      font-weight: 400;
    }

    & span {
      font-size: 13px;
      line-height: 15px;
      padding: 5px 0 10px;
    }

    & .button {
      padding: 6px 15px;
      height: 30px;
      font-size: 13px;
      font-family: "Roboto Condensed", sans-serif;
      margin-top: 20px;
    }
  }

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

  /* set margin on list of nodes */
  & :deep(ul.nodes) {
    margin-left: 15px;
    margin-right: 15px;
  }

  & :deep(.results .content) {
    padding: 0;
  }

  & :deep(.more-nodes-button) {
    background: transparent;
  }

  & :deep(.results),
  & .recommendations {
    background: transparent;
    max-height: calc(calc(var(--quick-add-node-height) - var(--quick-add-node-header-height)) * 1px);
    padding-top: 3px;
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

  & .recommendations {
    overflow-y: auto;
    padding-bottom: 10px;

    & .content {
      padding-bottom: 10px;
    }
  }

  & .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-style: italic;
    color: var(--knime-dove-gray);
    flex-direction: column;
    margin-top: 30px;
    margin-bottom: 15px;
  }

  /* marks the default item (first one); gets inserted on enter while still in the search box */
  & :deep(.top-list li.no-selection[data-index="0"] > div),
  & :deep(.top-list-is-empty .bottom-list li.no-selection[data-index="0"] > div){
    outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid var(--knime-dove-gray);
    border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
    background-color: var(--knime-porcelain);
  }

}
</style>
