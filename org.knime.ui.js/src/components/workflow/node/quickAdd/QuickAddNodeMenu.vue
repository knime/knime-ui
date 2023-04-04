<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapGetters, mapState } from 'vuex';
import { API } from '@api';

import Button from 'webapps-common/ui/components/Button.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import SearchBar from '@/components/common/SearchBar.vue';

import { checkPortCompatibility } from '@/util/compatibleConnections';
import { portPositions } from '@/util/portShift';

import { debounce } from 'lodash';
import NodeList from '@/components/nodeRepository/NodeList.vue';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';
import SearchResults from '@/components/nodeRepository/SearchResults.vue';

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
        NodeList,
        SearchResults,
        NodeTemplate,
        SearchBar,
        Button,
        FloatingMenu
    },
    props: {
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
    emits: ['menuClose'],
    data() {
        return {
            selectedNode: null
        };
    },
    computed: {
        ...mapState('application', ['hasNodeRecommendationsEnabled', 'hasNodeCollectionActive', 'availablePortTypes']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('quickAddNodes', ['topNodes', 'bottomNodes', 'recommendedNodes', 'isShowingBottomNodes']),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('quickAddNodes', ['searchIsActive']),

        searchQuery: {
            get() {
                return this.$store.state.quickAddNodes.query;
            },
            set: debounce(function (value) {
                // @ts-ignore
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
        ghostSizeZoomed() {
            return this.$shapes.addNodeGhostSize * this.zoomFactor;
        },
        hasRecommendationResults() {
            return this.recommendedNodes?.length > 0;
        },
        hasSearchResults() {
            return this.topNodes?.length > 0 || this.bottomNodes?.length > 0;
        },
        searchActions() {
            return {
                searchTopNodesNextPage: this.searchTopNodesNextPage,
                searchBottomNodesNextPage: this.searchBottomNodesNextPage,
                toggleShowingBottomNodes: this.toggleShowingBottomNodes
            };
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
        }
    },
    mounted() {
        this.$store.commit('quickAddNodes/setPortTypeId', this.port.typeId);
        // @ts-ignore
        this.$refs.search?.focus();
    },
    beforeUnmount() {
        // reset query on close (in any case!)
        this.searchQuery = '';
        this.$store.commit('quickAddNodes/setPortTypeId', null);
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
            await this.$store.dispatch('quickAddNodes/getNodeRecommendations', {
                nodeId: this.nodeId,
                portIdx: this.port.index
            });
        },

        async addNode({ nodeFactory, inPorts }) {
            if (!this.isWritable) {
                return; // end here
            }

            const [offsetX, offsetY] = calculatePortOffset({
                targetPorts: inPorts,
                sourcePort: this.port,
                availablePortTypes: this.availablePortTypes
            });

            // add node
            const { canvasPosition: { x, y } } = this;
            await this.$store.dispatch('workflow/addNode', {
                position: {
                    x: x - offsetX,
                    y: y - offsetY
                },
                nodeFactory,
                sourceNodeId: this.nodeId,
                sourcePortIdx: this.port.index
            });

            this.$emit('menuClose');
        },
        searchEnterKey() {
            if (this.searchIsActive) {
                if (this.topNodes?.length > 0) {
                    this.addNode(this.topNodes[0]);
                }
            } else if (this.recommendedNodes?.length > 0) {
                this.addNode(this.recommendedNodes[0]);
            }
        },
        searchDownKey() {
            // @ts-ignore
            this.$refs.recommendationResults?.focusFirst();
            // @ts-ignore
            this.$refs.searchResults?.focusFirst();
        }
    }
});
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    :style="`--ghost-size: ${ghostSizeZoomed}; --extra-margin: ${Math.log(ghostSizeZoomed) / 1.1}`"
    aria-label="Quick add node"
    :prevent-oveflow="true"
    @menu-close="$emit('menuClose')"
  >
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
          <SearchResults
            ref="searchResults"
            v-model:selected-node="selectedNode"
            :top-nodes="topNodes"
            :bottom-nodes="bottomNodes"
            :has-node-collection-active="hasNodeCollectionActive"
            :is-showing-bottom-nodes="isShowingBottomNodes"
            :search-actions="searchActions"
            :query="searchQuery"
            @nav-reached-top="($refs.search as any).focus()"
            @item-enter-key="addNode($event)"
          >
            <template #topNodeTemplate="itemProps">
              <NodeTemplate
                v-bind="itemProps"
                @click="addNode(itemProps.nodeTemplate)"
              />
            </template>
            <template #bottomNodeTemplate="itemProps">
              <NodeTemplate
                v-bind="itemProps"
                @click="addNode(itemProps.nodeTemplate)"
              />
            </template>
          </SearchResults>
        </div>
        <div
          v-else
          class="recommendations"
        >
          <NodeList
            v-if="hasRecommendationResults"
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

  width: 340px;
  margin-top: calc(var(--ghost-size) / 2 * 1px + var(--extra-margin) * 1px + 3px);

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
    scrollbar-width: thin;
    scrollbar-gutter: stable both-edges;
    padding-bottom: 10px;

    & .content {
      padding-bottom: 10px;
    }

    & .nodes {
      justify-content: center;
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
  & :deep(.top-list li.no-selection[data-index="0"] > div) {
    outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid var(--knime-dove-gray);
    border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
    background-color: var(--knime-porcelain);
  }

}
</style>
