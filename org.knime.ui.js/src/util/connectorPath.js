/* eslint-disable no-magic-numbers */
import { portSize } from "@/style/shapes";

// These deltas are carefully chosen so that the connector line is hidden behind the flow variable line,
// especially for optional ports, even when hovering the port or the connector line.
// (Optional output ports are useless, but are technically possible and do exist out in the wild)
const deltaX1 = portSize / 2 - 0.5;
const deltaX2 = portSize / 2 - 0.5;

export default (x1, y1, x2, y2, offsetStart = false, offsetEnd = false) => {
  x1 += deltaX1;
  x2 -= deltaX2;

  const width = Math.abs(x1 - x2);
  const height = Math.abs(y1 - y2);

  const widthHalf = width / 4;
  const heightThird = height / 4;

  const xOffsetStart = offsetStart ? 4 : 0;
  const xOffsetEnd = offsetEnd ? 4 : 0;

  // Currently, this is creates just an arbitrary curve that seems to work in most cases
  return (
    `M${x1 - xOffsetStart},${y1} ` +
    `C${x1 + widthHalf + heightThird},${y1} ` +
    `${x2 - widthHalf - heightThird},${y2} ` +
    `${x2 + xOffsetEnd},${y2}`
  );
};
