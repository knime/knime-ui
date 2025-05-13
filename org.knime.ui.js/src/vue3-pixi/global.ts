import "vue";
import "pixi.js";
// TODO: import type { NineSliceSpriteComponent } from './elements/nineSliceSprite'
import type { AlphaFilterComponent } from "./elements/alphaFilter";
import type { AnimatedSpriteComponent } from "./elements/animatedSprite";
import type { BitmapTextComponent } from "./elements/bitmapText";
import type { BlurFilterComponent } from "./elements/blurFilter";
import type { ColorMatrixFilterComponent } from "./elements/colorMatrixFilter";
import type { ContainerComponent } from "./elements/container";
import type { DisplacementFilterComponent } from "./elements/displacementFilter";
import type { FilterComponent } from "./elements/filter";
import type { GraphicsComponent } from "./elements/graphics";
import type { MeshComponent } from "./elements/mesh";
import type { MeshPlaneComponent } from "./elements/meshPlane";
import type { MeshRopeComponent } from "./elements/meshRope";
import type { ParticleContainerComponent } from "./elements/particleContainer";
import type { SpriteComponent } from "./elements/sprite";
import type { TextComponent } from "./elements/text";
import type { TilingSpriteComponent } from "./elements/tilingSprite";

declare module "vue" {
  export interface GlobalComponents {
    Filter: FilterComponent;
    PixiFilter: FilterComponent;

    BlurFilter: BlurFilterComponent;
    PixiBlurFilter: BlurFilterComponent;

    AlphaFilter: AlphaFilterComponent;
    PixiAlphaFilter: AlphaFilterComponent;

    DisplacementFilter: DisplacementFilterComponent;
    PixiDisplacementFilter: DisplacementFilterComponent;

    ColorMatrixFilter: ColorMatrixFilterComponent;
    PixiColorMatrixFilter: ColorMatrixFilterComponent;

    // TODO: FXAAFilter: FXAAFilterComponent
    //  TODO: PixiFXAAFilter: FXAAFilterComponent

    Container: ContainerComponent;
    PixiContainer: ContainerComponent;

    ParticleContainer: ParticleContainerComponent;
    PixiParticleContainer: ParticleContainerComponent;

    Sprite: SpriteComponent;
    PixiSprite: SpriteComponent;

    Graphics: GraphicsComponent;
    PixiGraphics: GraphicsComponent;

    Text: TextComponent;
    PixiText: TextComponent;

    BitmapText: BitmapTextComponent;
    PixiBitmapText: BitmapTextComponent;

    TilingSprite: TilingSpriteComponent;
    PixiTilingSprite: TilingSpriteComponent;

    AnimatedSprite: AnimatedSpriteComponent;
    PixiAnimatedSprite: AnimatedSpriteComponent;

    Mesh: MeshComponent;
    PixiMesh: MeshComponent;

    MeshPlane: MeshPlaneComponent;
    PixiMeshPlane: MeshPlaneComponent;

    // TODO: NineSliceSprite: NineSliceSpriteComponent
    // TODO: PixiNineSliceSprite: NineSliceSpriteComponent

    MeshRope: MeshRopeComponent;
    PixiMeshRope: MeshRopeComponent;
  }
}

declare module "pixi.js" {
  interface Filter {
    parent: Container;
    _vp_name: string;
    _vp_filter: boolean;
  }
  interface Container {
    _vp_name: string;
    dataset?: { [key: string]: string };
  }
}

export * from "./elements/meshRope";
export * from "./elements/meshPlane";
export * from "./elements/nineSliceSprite";
export * from "./elements/mesh";
export * from "./elements/animatedSprite";
export * from "./elements/tilingSprite";
export * from "./elements/text";
export * from "./elements/graphics";
export * from "./elements/container";
export * from "./elements/sprite";
export * from "./elements/bitmapText";
export * from "./elements/filter";
export * from "./elements/blurFilter";
export * from "./elements/alphaFilter";
export * from "./elements/displacementFilter";
export * from "./elements/colorMatrixFilter";
export * from "./elements/props";
export * from "./elements/events";
export * from "./elements/particleContainer";
