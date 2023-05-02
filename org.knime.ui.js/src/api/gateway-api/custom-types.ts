import type { ComponentNode, MetaNode, NativeNode, PortType } from './generated-api';

export type AvailablePortTypes = Record<string, PortType>;
export type KnimeNode = NativeNode | ComponentNode | MetaNode;
