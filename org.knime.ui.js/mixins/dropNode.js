import { mapGetters, mapActions } from 'vuex';

export const KnimeMIME = 'application/vnd.knime.ap.noderepo+json';
const isKnimeNode = (e) => e.dataTransfer.types.includes(KnimeMIME);

export const dropNode = {
    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('workflow', ['isWritable'])
    },
    methods: {
        ...mapActions('workflow', ['addNode']),
        onDrop(e) {
            if (this.isWritable) {
                const nodeFactory = JSON.parse(e.dataTransfer.getData(KnimeMIME));
                const position = this.getDestinationPosition(e);
                this.addNode({ position, nodeFactory });
            }

            // Default action when dropping links is to open them in your browser.
            e.preventDefault();
        },
        getDestinationPosition(e) {
            return this.screenToCanvasCoordinates([
                e.clientX - this.$shapes.nodeSize / 2,
                e.clientY - this.$shapes.nodeSize / 2
            ]);
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
