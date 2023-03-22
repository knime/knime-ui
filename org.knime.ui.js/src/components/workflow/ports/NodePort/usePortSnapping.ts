import { computed } from 'vue';
import { useStore } from 'vuex';

import type { NodePort, PortGroup, PortType } from '@/api/gateway-api/generated-api';

import { checkCompatibleConnectionAndPort,
    generateValidPortGroupsForPlaceholderPort,
    type Direction } from '@/util/compatibleConnections';

type PlaceholderPort = {
    isPlaceHolderPort: boolean
}

export type PortSnapCallback = (params: {
    snapPosition: [number, number];
    targetPort: NodePort | PlaceholderPort;
    targetPortGroups: Record<string, PortGroup>;
}) => {
    didSnap: boolean;
    createPortFromPlaceholder: { validPortGroups: Record<string, PortGroup> } | null
}

const isPlaceholderPort = (
    port: NodePort | PlaceholderPort
): port is PlaceholderPort => (port as PlaceholderPort).isPlaceHolderPort;


export const usePortSnapping = () => {
    const store = useStore();
    const connections = computed(() => store.state.workflow.activeWorkflow.connections);
    const availablePortTypes = computed<Record<string, PortType>>(() => store.state.application.availablePortTypes);

    const shouldPortSnap = ({
        sourcePort,
        targetPort,
        targetPortDirection,
        targetPortGroups
    }: {
        sourcePort: NodePort;
        targetPort: NodePort | PlaceholderPort;
        targetPortDirection: Direction;
        targetPortGroups: Record<string, PortGroup>;
    }) => {
        let isCompatible: boolean = false;
        let validPortGroups: Record<string, PortGroup> | null = null;

        if (isPlaceholderPort(targetPort)) {
            validPortGroups = generateValidPortGroupsForPlaceholderPort({
                fromPort: sourcePort,
                availablePortTypes: availablePortTypes.value,
                // availablePortTypes,
                targetPortDirection,
                targetPortGroups
            });
            isCompatible = validPortGroups !== null;
        } else {
            isCompatible = checkCompatibleConnectionAndPort({
                fromPort: sourcePort,
                toPort: targetPort,
                // availablePortTypes,
                availablePortTypes: availablePortTypes.value,
                targetPortDirection,
                // connections
                connections: connections.value
            });
        }

        return { isCompatible, validPortGroups };
    };

    return { shouldPortSnap };
};
