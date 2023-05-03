import type { ComponentNode, MetaNode, NativeNode, PortType } from './generated-api';

export type AvailablePortTypes = Record<string, PortType>;
export type KnimeNode = NativeNode | ComponentNode | MetaNode;

// TODO: UIEXT-932 remove types once they can be generated automatically
export type ResourceInfo = {
    id: string;
    type: 'VUE_COMPONENT_LIB' | 'VUE_COMPONENT_REFERENCE';
}
export type ViewConfig = {
    initialData: string;
    resourceInfo: ResourceInfo;
}
