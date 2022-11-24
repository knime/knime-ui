import { mapGetters, mapActions } from 'vuex';
import { adjustToGrid } from '@/util/geometry';

export const KnimeMIME = 'application/vnd.knime.ap.noderepo+json';
const isKnimeNode = (e) => e.dataTransfer.types.includes(KnimeMIME);

export const dropNode = {
    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('workflow', ['isWritable'])
    },
    methods: {
        ...mapActions('workflow', ['addNode']),
        ...mapActions('selection', ['selectNode', 'deselectAllObjects']),
        async onDrop(e) {
            if (this.isWritable) {
                const nodeFactory = JSON.parse(e.dataTransfer.getData(KnimeMIME));
                const [x, y] = this.getDestinationPosition(e);
                try {
                    const { newNodeId } = await this.addNode({ position: { x, y }, nodeFactory });
                    this.deselectAllObjects();
                    this.selectNode(newNodeId);
                } catch (error) {
                    consola.error({ message: 'Error adding node to workflow', error });
                    throw error;
                }
            }

            // Default action when dropping links is to open them in your browser.
            e.preventDefault();
        },
        getDestinationPosition(e) {
            const [x, y] = this.screenToCanvasCoordinates([
                e.clientX - this.$shapes.nodeSize / 2,
                e.clientY - this.$shapes.nodeSize / 2
            ]);
            
            // Adjusted For Grid Snapping
            const gridAdjustedPosition = adjustToGrid({
                coords: { x, y },
                gridSize: this.$shapes.gridSize
            });

            return [gridAdjustedPosition.x, gridAdjustedPosition.y];
        },
        onDragOver(e) {
            if (this.isWritable && isKnimeNode(e)) {
                e.dataTransfer.dropEffect = 'copy';

                // Enables drop target to accept this node
                e.preventDefault();
            }
        }
    }
};
