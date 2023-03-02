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
        ...mapActions('selection', ['selectNode', 'deselectAllObjects']),
        async onDrop(e) {
            // TODO NXT-1586 Enhance drag and drop from side panel
            if (this.isWritable) {
                const data = e.dataTransfer.getData(KnimeMIME);

                if (!data) {
                    return;
                }
                
                const nodeFactory = JSON.parse(data);
                const [x, y] = this.screenToCanvasCoordinates([
                    e.clientX - this.$shapes.nodeSize / 2,
                    e.clientY - this.$shapes.nodeSize / 2
                ]);

                try {
                    await this.addNode({ position: { x, y }, nodeFactory });
                } catch (error) {
                    consola.error({ message: 'Error adding node to workflow', error });
                    throw error;
                }
            }

            // Default action when dropping links is to open them in your browser.
            e.preventDefault();
        },

        onDragOver(e) {
            if (this.isWritable && isKnimeNode(e)) {
                e.dataTransfer.dropEffect = 'copy';
            }
        }
    }
};
