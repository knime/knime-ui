import { GraphicsContext } from "pixi.js";

/**
 * This loads a svg string into a pixi GraphicsContext.
 * - It sets the stroke of the icon (only the global one) to white color so it can be tint'ed.
 * - It adds a invisible rect of the viewBox (if given otherwise 32x32) to have proper size of the path(s)
 * @param icon svg icon string
 */
const loadSvgInGraphicsContext = (icon: string) => {
  const context = new GraphicsContext();

  const div = document.createElement("div");
  div.innerHTML = icon.trim();
  const svg = div.querySelector("svg") as SVGElement;
  svg.setAttribute("stroke", "white");

  // map view box to a rect to have a size for the graphic
  const viewBox = svg.getAttribute("viewBox") ?? "0 0 32 32";
  // eslint-disable-next-line no-magic-numbers
  const viewBoxValues = viewBox.split(" ").map((x) => parseInt(x, 10)) as [
    number,
    number,
    number,
    number,
  ];
  context.rect(...viewBoxValues);
  context.stroke({ alpha: 0 });

  // @ts-ignore
  return context.svg(svg);
};

export { loadSvgInGraphicsContext };
