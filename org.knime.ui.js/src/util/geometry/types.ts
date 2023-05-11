export type GeometryArea = {
    width: number;
    height: number;
}

export type XYPosition = {
    x: number;
    y: number;
}

export type GeometryBounds = {
    top: number;
    left: number;
} & GeometryArea
