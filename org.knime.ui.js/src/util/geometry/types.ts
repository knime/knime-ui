export type GeometryArea = {
    width: number;
    height: number;
}

export type GeometryBounds = {
    top: number;
    left: number;
    right?: number;
    bottom?: number;
} & GeometryArea
