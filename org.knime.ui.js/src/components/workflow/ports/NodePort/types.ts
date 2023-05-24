export interface DragConnector {
  id: string;
  flowVariableConnection: boolean;
  absolutePoint: [number, number];
  allowedActions: { canDelete: boolean };
  interactive?: boolean;
  sourceNode?: string;
  sourcePort?: number;
  destNode?: string;
  destPort?: number;
}
