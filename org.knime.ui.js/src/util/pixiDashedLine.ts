/* eslint-disable func-style */
/* eslint-disable max-params */
/* eslint-disable max-depth */
/* eslint-disable no-undefined */
/* eslint-disable no-magic-numbers */

/**
 * Implementation ported over from https://github.com/davidfig/pixi-dashed-line/.
 * Since the package is not compatible with Pixi 8 as of now (and seems
 * abandoned) then it is inlined here.
 */

import * as PIXI from "pixi.js";

/** Define the dash: [dash length, gap size, dash size, gap size, ...] */
export type Dashes = number[];

export type DashLineOptions = {
  dash?: Dashes;
  dashOffset?: number;
  width?: number;
  color?: PIXI.ColorSource;
  alpha?: number;
  scale?: number;
  useTexture?: boolean;
  useDots?: boolean;
  cap?: PIXI.LineCap;
  join?: "bevel" | "miter" | "round";
  alignment?: number;
};

function getPointOnArc(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  matrix?: PIXI.Matrix,
) {
  const radian = (angle * Math.PI) / 180;
  const x = cx + Math.cos(radian) * radius;
  const y = cy + Math.sin(radian) * radius;

  if (matrix) {
    const p = new PIXI.Point(x, y);
    matrix.apply(p, p);
    return { x: p.x, y: p.y };
  }
  return { x, y };
}

const dashLineOptionsDefault: Partial<DashLineOptions> = {
  dash: [10, 5],
  dashOffset: 0,
  width: 1,
  color: 0xffffff,
  alpha: 1,
  scale: 1,
  useTexture: false,
  alignment: 0.5,
};

export class DashLine {
  graphics: PIXI.Graphics;

  /** current length of the line */
  lineLength: number = 0;

  /** cursor location */
  cursor = new PIXI.Point();

  /** desired scale of line */
  scale = 1;

  // sanity check to ensure the strokeStyle is still in use
  private activeTexture: PIXI.Texture | undefined;

  private start: PIXI.Point = new PIXI.Point(0, 0);

  private readonly dashSize: number;
  private readonly dash: number[];

  private readonly useTexture: boolean;
  private readonly options: Required<DashLineOptions>;

  // cache of PIXI.Textures for dashed lines
  static readonly dashTextureCache: Record<string, PIXI.Texture> = {};

  private readonly ticker: PIXI.Ticker | null = null;

  /**
   * Create a DashLine
   * @param graphics
   * @param [options]
   * @param [options.useTexture=false] - use the texture based render (useful for very large or very small dashed lines)
   * @param [options.dashes=[10,5] - an array holding the dash and gap (eg, [10, 5, 20, 5, ...])
   * @param [options.dashOffset=0] - an offset for the dash pattern (useful for animation)
   * @param [options.width=1] - width of the dashed line
   * @param [options.alpha=1] - alpha of the dashed line
   * @param [options.color=0xffffff] - color of the dashed line
   * @param [options.cap] - add a PIXI.LINE_CAP style to dashed lines (only works for useTexture: false)
   * @param [options.join] - add a PIXI.LINE_JOIN style to the dashed lines (only works for useTexture: false)
   * @param [options.alignment] - The alignment of any lines drawn (0.5 = middle, 1 = outer, 0 = inner)
   */
  constructor(graphics: PIXI.Graphics, options: DashLineOptions = {}) {
    this.graphics = graphics;
    const mergedOpts = {
      ...dashLineOptionsDefault,
      ...options,
    } as Required<DashLineOptions>;
    this.dash = mergedOpts.dash!;
    this.dashSize = this.dash.reduce((a, b) => a + b, 0);
    this.useTexture = Boolean(mergedOpts.useTexture);
    this.options = mergedOpts;
    this.setStrokeStyle();
  }

  /** resets line style to enable dashed line (useful if strokeStyle was changed on graphics element) */
  setStrokeStyle() {
    const options = this.options;
    if (this.useTexture) {
      const texture = DashLine.getTexture(options, this.dashSize);
      this.graphics.stroke({
        width: options.width * options.scale,
        color: options.color,
        alpha: options.alpha,
        texture,
        alignment: options.alignment,
      });
      this.activeTexture = texture!;
    } else {
      this.graphics.stroke({
        width: options.width * options.scale,
        color: options.color,
        alpha: options.alpha,
        cap: options.cap,
        join: options.join,
        alignment: options.alignment,
      });
    }
    this.scale = options.scale;
  }

  private static distance(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  moveTo(x: number, y: number): this {
    this.lineLength = 0;
    this.cursor.set(x, y);
    this.start = new PIXI.Point(x, y);
    this.graphics.moveTo(this.cursor.x, this.cursor.y);
    return this;
  }

  lineTo(x: number, y: number, closePath?: boolean): this {
    if (this.lineLength === undefined) {
      this.moveTo(0, 0);
    }
    const length = DashLine.distance(this.cursor.x, this.cursor.y, x, y);
    const angle = Math.atan2(y - this.cursor.y, x - this.cursor.x);
    const closed = closePath && x === this.start.x && y === this.start.y;
    if (this.useTexture) {
      this.graphics.moveTo(this.cursor.x, this.cursor.y);
      this.adjustStrokeStyle(angle);
      if (closed && this.dash.length % 2 === 0) {
        const gap = Math.min(this.dash[this.dash.length - 1], length);
        this.graphics.lineTo(
          x - Math.cos(angle) * gap,
          y - Math.sin(angle) * gap,
        );
        this.graphics.closePath();
      } else {
        this.graphics.lineTo(x, y);
      }
    } else {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let x0 = this.cursor.x;
      let y0 = this.cursor.y;

      // find the first part of the dash for this line
      const place =
        (this.lineLength + this.options.dashOffset) %
        (this.dashSize * this.scale);
      let dashIndex: number = 0;
      let dashStart: number = 0;
      let dashX = 0;
      for (let i = 0; i < this.dash.length; i++) {
        const dashSize = this.dash[i] * this.scale;
        if (place < dashX + dashSize) {
          dashIndex = i;
          dashStart = place - dashX;
          break;
        } else {
          dashX += dashSize;
        }
      }

      let remaining = length;
      // let count = 0
      while (remaining > 0) {
        // && count++ < 1000) {
        const dashSize = this.dash[dashIndex] * this.scale - dashStart;
        const dist = remaining > dashSize ? dashSize : remaining;
        if (closed) {
          const remainingDistance = DashLine.distance(
            x0 + cos * dist,
            y0 + sin * dist,
            this.start.x,
            this.start.y,
          );
          if (remainingDistance <= dist) {
            if (dashIndex % 2 === 0) {
              const lastDash =
                DashLine.distance(x0, y0, this.start.x, this.start.y) -
                this.dash[this.dash.length - 1] * this.scale;
              x0 += cos * lastDash;
              y0 += sin * lastDash;
              this.graphics.lineTo(x0, y0);
            }
            break;
          }
        }

        x0 += cos * dist;
        y0 += sin * dist;
        if (dashIndex % 2) {
          this.graphics.moveTo(x0, y0);
        } else {
          this.graphics.lineTo(x0, y0);
        }
        remaining -= dist;

        dashIndex++;
        dashIndex = dashIndex === this.dash.length ? 0 : dashIndex;
        dashStart = 0;
      }
    }
    this.lineLength += length;
    this.cursor.set(x, y);
    return this;
  }

  closePath() {
    this.lineTo(this.start.x, this.start.y, true);
  }

  bezierCurveTo(
    cpX: number,
    cpY: number,
    cpX2: number,
    cpY2: number,
    toX: number,
    toY: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    smoothness = 1, // not used, but needed for compatibility with normal bezierCurveTo function
    segments = 50,
  ): this {
    const fromX = this.cursor.x;
    const fromY = this.cursor.y;

    let previousPoint = new PIXI.Point(fromX, fromY);
    let dashOffset = this.options.dashOffset;

    for (let t = 1 / segments; t <= 1; t += 1 / segments) {
      const x =
        Math.pow(1 - t, 3) * fromX +
        3 * Math.pow(1 - t, 2) * t * cpX +
        3 * (1 - t) * Math.pow(t, 2) * cpX2 +
        Math.pow(t, 3) * toX;
      const y =
        Math.pow(1 - t, 3) * fromY +
        3 * Math.pow(1 - t, 2) * t * cpY +
        3 * (1 - t) * Math.pow(t, 2) * cpY2 +
        Math.pow(t, 3) * toY;

      const currentPoint = new PIXI.Point(x, y);
      const segmentLength = DashLine.distance(
        previousPoint.x,
        previousPoint.y,
        currentPoint.x,
        currentPoint.y,
      );

      this._drawDashedSegment(
        previousPoint,
        currentPoint,
        segmentLength,
        dashOffset,
      );
      dashOffset = (dashOffset + segmentLength) % (this.dashSize * this.scale);

      previousPoint = currentPoint;
    }

    // Last segment might need to be drawn separately if it does not align with the dash pattern
    const finalPoint = new PIXI.Point(toX, toY);
    const finalSegmentLength = DashLine.distance(
      previousPoint.x,
      previousPoint.y,
      finalPoint.x,
      finalPoint.y,
    );
    if (finalSegmentLength > 0) {
      this._drawDashedSegment(
        previousPoint,
        finalPoint,
        finalSegmentLength,
        dashOffset,
      );
    }

    return this;
  }

  private _drawDashedSegment(
    start: PIXI.Point,
    end: PIXI.Point,
    segmentLength: number,
    dashOffset: number,
  ): void {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let remaining = segmentLength;
    let x0 = start.x;
    let y0 = start.y;

    // Find the starting dash index and offset
    let dashIndex = 0;
    let dashStart = dashOffset;
    while (dashStart >= this.dash[dashIndex] * this.scale) {
      dashStart -= this.dash[dashIndex] * this.scale;
      dashIndex = (dashIndex + 1) % this.dash.length;
    }

    // Draw the dashed segment
    while (remaining > 0) {
      const dashSize = this.dash[dashIndex] * this.scale - dashStart;
      const dist = remaining > dashSize ? dashSize : remaining;

      x0 += cos * dist;
      y0 += sin * dist;

      if (dashIndex % 2 === 0) {
        this.graphics.lineTo(x0, y0);
      } else {
        this.graphics.moveTo(x0, y0);
      }

      remaining -= dist;
      dashIndex = (dashIndex + 1) % this.dash.length;
      dashStart = 0;
    }

    this.lineLength += segmentLength;
    this.cursor.set(end.x, end.y);
  }

  circle(
    x: number,
    y: number,
    radius: number,
    points = 80,
    matrix?: PIXI.Matrix,
  ): this {
    const interval = (Math.PI * 2) / points;
    let angle = 0;
    let first: PIXI.Point;
    if (matrix) {
      first = new PIXI.Point(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
      );
      matrix.apply(first, first);
      this.moveTo(first[0], first[1]);
    } else {
      first = new PIXI.Point(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
      );
      this.moveTo(first.x, first.y);
    }
    angle += interval;
    for (let i = 1; i < points + 1; i++) {
      const next =
        i === points
          ? first
          : [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
      this.lineTo(next[0], next[1]);
      angle += interval;
    }
    return this;
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    points = 80,
    matrix?: PIXI.Matrix,
  ): this {
    const interval = (Math.PI * 2) / points;
    let first: { x: number; y: number } = { x: 0, y: 0 };

    const point = new PIXI.Point();
    for (let i = 0; i < Math.PI * 2; i += interval) {
      let x0 = x - radiusX * Math.sin(i);
      let y0 = y - radiusY * Math.cos(i);
      if (matrix) {
        point.set(x0, y0);
        matrix.apply(point, point);
        x0 = point.x;
        y0 = point.y;
      }
      if (i === 0) {
        this.moveTo(x0, y0);
        first = { x: x0, y: y0 };
      } else {
        this.lineTo(x0, y0);
      }
    }
    this.lineTo(first.x, first.y, true);
    return this;
  }

  poly(points: PIXI.Point[] | number[], matrix?: PIXI.Matrix): this {
    const p = new PIXI.Point();
    if (typeof points[0] === "number") {
      if (matrix) {
        p.set(points[0], points[1] as number);
        matrix.apply(p, p);
        this.moveTo(p.x, p.y);
        for (let i = 2; i < points.length; i += 2) {
          p.set(points[i] as number, points[i + 1] as number);
          matrix.apply(p, p);
          this.lineTo(p.x, p.y, i === points.length - 2);
        }
      } else {
        this.moveTo(points[0], points[1] as number);
        for (let i = 2; i < points.length; i += 2) {
          this.lineTo(
            points[i] as number,
            points[i + 1] as number,
            i === points.length - 2,
          );
        }
      }
    } else if (matrix) {
      const point = points[0];
      p.copyFrom(point);
      matrix.apply(p, p);
      this.moveTo(p.x, p.y);
      for (let i = 1; i < points.length; i++) {
        const point = points[i] as PIXI.Point;
        p.copyFrom(point);
        matrix.apply(p, p);
        this.lineTo(p.x, p.y, i === points.length - 1);
      }
    } else {
      const point = points[0];
      this.moveTo(point.x, point.y);
      for (let i = 1; i < points.length; i++) {
        const point = points[i] as PIXI.Point;
        this.lineTo(point.x, point.y, i === points.length - 1);
      }
    }
    return this;
  }

  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    matrix?: PIXI.Matrix,
  ): this {
    if (matrix) {
      const p = new PIXI.Point();

      // moveTo(x, y)
      p.set(x, y);
      matrix.apply(p, p);
      this.moveTo(p.x, p.y);

      // lineTo(x + width, y)
      p.set(x + width, y);
      matrix.apply(p, p);
      this.lineTo(p.x, p.y);

      // lineTo(x + width, y + height)
      p.set(x + width, y + height);
      matrix.apply(p, p);
      this.lineTo(p.x, p.y);

      // lineto(x, y + height)
      p.set(x, y + height);
      matrix.apply(p, p);
      this.lineTo(p.x, p.y);

      // lineTo(x, y, true)
      p.set(x, y);
      matrix.apply(p, p);
      this.lineTo(p.x, p.y, true);
    } else {
      this.moveTo(x, y)
        .lineTo(x + width, y)
        .lineTo(x + width, y + height)
        .lineTo(x, y + height)
        .lineTo(x, y, true);
    }
    return this;
  }

  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number = 10, // New parameter for rounded corners
    matrix?: PIXI.Matrix,
  ): this {
    const minSize = Math.min(width, height);
    cornerRadius = Math.min(cornerRadius, minSize / 2); // Ensure radius is valid

    const p = new PIXI.Point();

    // Helper function to move points using matrix
    const transformPoint = (px: number, py: number) => {
      if (matrix) {
        p.set(px, py);
        matrix.apply(p, p);
        return { x: p.x, y: p.y };
      }
      return { x: px, y: py };
    };

    // Start at the top-left corner, moving to the first point
    const start = transformPoint(x + cornerRadius, y);
    this.moveTo(start.x, start.y);

    // Top edge
    let end = transformPoint(x + width - cornerRadius, y);
    this.lineTo(end.x, end.y);
    this.drawDashedArc(
      x + width - cornerRadius,
      y + cornerRadius,
      cornerRadius,
      -90,
      0,
      matrix,
    );

    // Right edge
    end = transformPoint(x + width, y + height - cornerRadius);
    this.lineTo(end.x, end.y);
    this.drawDashedArc(
      x + width - cornerRadius,
      y + height - cornerRadius,
      cornerRadius,
      0,
      90,
      matrix,
    );

    // Bottom edge
    end = transformPoint(x + cornerRadius, y + height);
    this.lineTo(end.x, end.y);
    this.drawDashedArc(
      x + cornerRadius,
      y + height - cornerRadius,
      cornerRadius,
      90,
      180,
      matrix,
    );

    // Left edge
    end = transformPoint(x, y + cornerRadius);
    this.lineTo(end.x, end.y);
    this.drawDashedArc(
      x + cornerRadius,
      y + cornerRadius,
      cornerRadius,
      180,
      270,
      matrix,
    );

    // Close path
    this.lineTo(start.x, start.y, true);

    return this;
  }

  private drawDashedArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    matrix?: PIXI.Matrix,
  ): this {
    const segments = 10; // Increase for smoother curves
    const angleStep = (endAngle - startAngle) / segments;

    for (let i = 1; i <= segments; i++) {
      const nextPoint = getPointOnArc(
        cx,
        cy,
        radius,
        startAngle + i * angleStep,
        matrix,
      );
      this.lineTo(nextPoint.x, nextPoint.y);
    }

    return this;
  }

  // adjust the matrix for the dashed texture
  private adjustStrokeStyle(angle: number) {
    const strokeStyle = this.graphics.strokeStyle;
    strokeStyle.matrix = new PIXI.Matrix();
    if (angle) {
      strokeStyle.matrix.rotate(angle);
    }
    if (this.scale !== 1) {
      strokeStyle.matrix.scale(this.scale, this.scale);
    }
    const textureStart = -this.lineLength;
    strokeStyle.matrix.translate(
      this.cursor.x + textureStart * Math.cos(angle),
      this.cursor.y + textureStart * Math.sin(angle),
    );
    this.graphics.stroke(strokeStyle);
  }

  // creates or uses cached texture
  private static getTexture(
    options: Required<DashLineOptions>,
    dashSize: number,
  ): PIXI.Texture | undefined {
    const key = options.dash.toString();
    if (DashLine.dashTextureCache[key]) {
      return DashLine.dashTextureCache[key];
    }
    const canvas = document.createElement("canvas");
    canvas.width = dashSize;
    canvas.height = Math.ceil(options.width);
    const context = canvas.getContext("2d");
    if (!context) {
      // eslint-disable-next-line no-console
      console.warn("Did not get context from canvas");
      return undefined;
    }

    context.strokeStyle = "white";
    context.globalAlpha = options.alpha;
    context.lineWidth = options.width;
    let x = 0;
    const y = options.width / 2;
    context.moveTo(x, y);
    for (let i = 0; i < options.dash.length; i += 2) {
      x += options.dash[i];
      context.lineTo(x, y);
      if (options.dash.length !== i + 1) {
        x += options.dash[i + 1];
        context.moveTo(x, y);
      }
    }
    context.stroke();
    const texture = (DashLine.dashTextureCache[key] =
      PIXI.Texture.from(canvas));
    texture.source.scaleMode = "nearest";
    return texture;
  }
}
