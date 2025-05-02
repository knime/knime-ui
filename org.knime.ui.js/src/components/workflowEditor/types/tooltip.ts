export interface TooltipDefinition {
  position: {
    x: number;
    y: number;
  };
  gap: number;
  anchorPoint?: { x: number; y: number };
  text: string;
  title?: string;
  issue?: string;
  resolutions?: string[];
  type?: "error" | "warning" | "default";
  orientation?: "top" | "bottom";
  hoverable?: boolean;
}
