import { mapGetters, mapActions } from 'vuex';

export const KnimeMIME = 'application/vnd.knime.ap.noderepo+json';
const isKnimeNode = (e) => e.dataTransfer.types.includes(KnimeMIME);

export const dropNode = {
    computed: {
        ...mapGetters('canvas', ['fromAbsoluteCoordinates']),
        ...mapGetters('workflow', ['isWritable'])
    },
    methods: {
        ...mapActions('workflow', ['addNode']),
        onDrop(e) {
            if (this.isWritable) {
                const nodeFactory = JSON.parse(e.dataTransfer.getData(KnimeMIME));
                const position = this.getDestinationPosition(e);
                this.addNode({ position, nodeFactory });
    
                // Default action when dropping links is to open them in your browser.
                e.preventDefault();
            } else {
                e.preventDefault();
            }
        },
        getDestinationPosition(e) {
            const halfNodeSize = this.$shapes.nodeSize / 2;
            const kanvasElement = document.getElementById('kanvas');
            const { offsetLeft, offsetTop, scrollLeft, scrollTop } = kanvasElement;
            let result = this.fromAbsoluteCoordinates([
                e.clientX - offsetLeft + scrollLeft - halfNodeSize,
                e.clientY - offsetTop + scrollTop - halfNodeSize
            ]);
            return result;
        },
        onDragOver(e) {
            if (isKnimeNode(e)) {
                if (this.isWritable) {
                    e.dataTransfer.dropEffect = 'copy';
    
                    // Enables drop target to accept this node
                    e.preventDefault();
                }
            }
        }
    }
};
