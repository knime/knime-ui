/* eslint-disable no-magic-numbers */
import type { Graphics } from "pixi.js";

const drawDefault = (graphics: Graphics) => {
  graphics
    .moveTo(0, 29.2)
    .lineTo(0, 2.8)
    .bezierCurveTo(0, 1.3, 1.3, 0, 2.8, 0)
    .lineTo(29.1, 0)
    .bezierCurveTo(30.7, 0, 32, 1.3, 32, 2.8)
    .lineTo(32, 29.1)
    .bezierCurveTo(32, 30.7, 30.7, 32, 29.1, 32)
    .lineTo(2.8, 32)
    .bezierCurveTo(1.3, 32, 0, 30.7, 0, 29.2);
};

const drawLoopEnd = (graphics: Graphics) => {
  graphics
    .moveTo(32, 2.8)
    .lineTo(32, 29.1)
    .bezierCurveTo(32, 30.7, 30.7, 32, 29.2, 32)
    .lineTo(4, 32)
    .lineTo(0, 16.1)
    .lineTo(4, 0)
    .lineTo(29.2, 0)
    .bezierCurveTo(30.7, 0, 32, 1.3, 32, 2.8);
};

const drawLoopStart = (graphics: Graphics) => {
  graphics
    .moveTo(0, 29.2)
    .lineTo(0, 2.8)
    .bezierCurveTo(0, 1.3, 1.3, 0, 2.8, 0)
    .lineTo(32, 0)
    .lineTo(28, 15.9)
    .lineTo(32, 32)
    .lineTo(2.8, 32)
    .bezierCurveTo(1.3, 32, 0, 30.7, 0, 29.2);
};

const drawVirtualIn = (graphics: Graphics) => {
  graphics
    .moveTo(32, 2.8)
    .lineTo(32, 29.1)
    .bezierCurveTo(32, 30.7, 30.7, 32, 29.2, 32)
    .lineTo(6.5, 32)
    .lineTo(0, 25.9)
    .lineTo(5.2, 15.9)
    .lineTo(0.7, 7.2)
    .lineTo(6.5, 0)
    .lineTo(29.2, 0)
    .bezierCurveTo(30.7, 0, 32, 1.3, 32, 2.8);
};

const drawVirtualOut = (graphics: Graphics) => {
  graphics
    .moveTo(0, 29.2)
    .lineTo(0, 2.8)
    .bezierCurveTo(0, 1.3, 1.3, 0, 2.8, 0)
    .lineTo(32, 0)
    .lineTo(26.2, 7.2)
    .lineTo(30.7, 15.9)
    .lineTo(25.5, 25.9)
    .lineTo(32, 32)
    .lineTo(2.8, 32)
    .bezierCurveTo(1.3, 32, 0, 30.7, 0, 29.2);
};

export const torsoDrawUtils = {
  drawDefault,
  drawLoopEnd,
  drawLoopStart,
  drawVirtualIn,
  drawVirtualOut,
};
