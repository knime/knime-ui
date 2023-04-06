<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapActions, mapGetters } from 'vuex';

import type { Bounds, WorkflowAnnotation } from '@/api/gateway-api/generated-api';

import { getMetaOrCtrlKey } from '@/util/navigator';
import TransformControls from './TransformControls.vue';
import LegacyAnnotationText from './LegacyAnnotationText.vue';

/**
 * A workflow annotation, a rectangular box containing text.
 */
export default defineComponent({
    components: {
        LegacyAnnotation,
        TransformControls
    },
    inheritAttrs: false,

    props: {
        annotation: {
            type: Object as PropType<WorkflowAnnotation>,
            required: true
        }
    },

    data() {
        return {
            selectionPreview: null
        };
    },

    computed: {
        ...mapState('workflow', {
            projectId: state => state.activeWorkflow.projectId,
            activeWorkflowId: state => state.activeWorkflow.info.containerId
        }),
        ...mapState('selection', ['selectedAnnotations']),
        ...mapGetters('selection', [
            'isAnnotationSelected',
            'selectedNodeIds',
            'selectedConnections',
            'selectedAnnotationIds'
        ]),

        isSelected() {
            return this.isAnnotationSelected(this.annotation.id);
        },
        showSelectionPlane() {
            if (this.selectionPreview === null) {
                return this.isSelected;
            }

            if (this.isSelected && this.selectionPreview === 'hide') {
                return false;
            }

            return this.selectionPreview === 'show' || this.isSelected;
        },
        showTransformControls() {
            const isMoreThanOneAnnotationSelected = this.selectedAnnotationIds.length > 1;
            const isOneOrMoreNodesSelected = this.selectedNodeIds.length >= 1;
            const isOneOrMoreConnectionsSelected = this.selectedConnections.length >= 1;
            let isMoreThanOneItemSelected =
            isMoreThanOneAnnotationSelected || isOneOrMoreNodesSelected || isOneOrMoreConnectionsSelected;

            return this.isSelected && !isMoreThanOneItemSelected;
        }
    },
    methods: {
        ...mapActions('selection', ['selectAnnotation', 'deselectAnnotation', 'deselectAllObjects']),
        ...mapActions('application', ['toggleContextMenu']),

        onLeftClick(event: MouseEvent) {
            const metaOrCtrlKey = getMetaOrCtrlKey();
            const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

            const action = isMultiselect && this.isSelected
                ? this.deselectAnnotation
                : this.selectAnnotation;

            action(this.annotation.id);
        },

        onContextMenu(event: PointerEvent) {
            const metaOrCtrlKey = getMetaOrCtrlKey();
            const isMultiselect = event.shiftKey || event[metaOrCtrlKey];

            if (!isMultiselect && !this.isSelected) {
                this.deselectAllObjects();
            }

            this.selectAnnotation(this.annotation.id);
            this.toggleContextMenu({ event });
        },

        setSelectionPreview(type: string) {
            this.selectionPreview = type;
        },

        transformAnnotation(bounds: Bounds) {
            this.$store.dispatch('workflow/transformWorkflowAnnotation', {
                bounds,
                annotationId: this.annotation.id
            });
        }
    }
});

</script>

<template>
  <TransformControls
    :show-transform-controls="showTransformControls"
    :show-selection="showSelectionPlane"
    :initial-value="annotation.bounds"
    @transform-end="transformAnnotation($event.bounds)"
    @click="onLeftClick"
    @pointerdown.right.stop="onContextMenu"
  >
    <template #default="{ transformedBounds }">
      <foreignObject
        :x="transformedBounds.x"
        :y="transformedBounds.y"
        :width="transformedBounds.width"
        :height="transformedBounds.height"
      >
        <LegacyAnnotation
          v-if="isLegacyAnnotation && !isEditing"
          :annotation="annotation"
          @edit-start="toggleEdit"
        />
        />
      </foreignObject>
    </template>
  </TransformControls>
</template>

<style lang="postcss" scoped>
div {
  font-family: "Roboto Condensed", sans-serif;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}
</style>
