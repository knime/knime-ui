/* eslint-disable no-magic-numbers */
import type { GraphicsInst } from "@/vue3-pixi";

const drawDefault = (graphics: GraphicsInst) => {
  graphics.moveTo(0, 29.2);
  graphics.lineTo(0, 2.8);
  graphics.quadraticCurveTo(0, 0, 2.8, 0);
  graphics.lineTo(29.2, 0);
  graphics.quadraticCurveTo(32, 0, 32, 2.8);
  graphics.lineTo(32, 29.2);
  graphics.quadraticCurveTo(32, 32, 29.2, 32);
  graphics.lineTo(2.8, 32);
  graphics.quadraticCurveTo(0, 32, 0, 29.2);
};

const drawLoopEnd = (graphics: GraphicsInst) => {
  graphics.moveTo(32, 2.8);
  graphics.lineTo(32, 29.2);
  graphics.quadraticCurveTo(32, 32, 29.2, 32);
  graphics.lineTo(4, 32);
  graphics.lineTo(0, 16.1);
  graphics.lineTo(4, 0);
  graphics.lineTo(29.2, 0);
  graphics.quadraticCurveTo(32, 0, 32, 2.8);
};

const drawLoopStart = (graphics: GraphicsInst) => {
  graphics.moveTo(0, 29.2);
  graphics.lineTo(0, 2.8);
  graphics.quadraticCurveTo(0, 0, 2.8, 0);
  graphics.lineTo(32, 0);
  graphics.lineTo(28, 15.9);
  graphics.lineTo(32, 32);
  graphics.lineTo(2.8, 32);
  graphics.quadraticCurveTo(0, 32, 0, 29.2);
};

const drawVirtualIn = (graphics: GraphicsInst) => {
  graphics.moveTo(32, 2.8);
  graphics.lineTo(32, 29.2);
  graphics.quadraticCurveTo(32, 32, 29.2, 32);
  graphics.lineTo(6.5, 32);
  graphics.lineTo(0, 25.9);
  graphics.lineTo(5.2, 15.9);
  graphics.lineTo(0.7, 7.2);
  graphics.lineTo(6.5, 0);
  graphics.lineTo(29.2, 0);
  graphics.quadraticCurveTo(32, 0, 32, 2.8);
};

const drawVirtualOut = (graphics: GraphicsInst) => {
  graphics.moveTo(0, 29.2);
  graphics.lineTo(0, 2.8);
  graphics.quadraticCurveTo(0, 0, 2.8, 0);
  graphics.lineTo(32, 0);
  graphics.lineTo(26.2, 7.2);
  graphics.lineTo(30.7, 15.9);
  graphics.lineTo(25.5, 25.9);
  graphics.lineTo(32, 32);
  graphics.lineTo(2.8, 32);
  graphics.quadraticCurveTo(0, 32, 0, 29.2);
};

export const torsoDrawUtils = {
  drawDefault,
  drawLoopEnd,
  drawLoopStart,
  drawVirtualIn,
  drawVirtualOut,
};
