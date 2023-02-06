import { camelCase } from 'lodash';
import { hashCode } from '@/util/hashCode';
import robotoCondensed from '@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff';

const LICENSE = `<!--
The embedded fonts are based on open source fonts

About Roboto & Roboto Condensed
https://fonts.google.com/specimen/Roboto/about
https://fonts.google.com/specimen/Roboto+Condensed/about?query=roboto+condensed

These fonts are licensed under the Apache License, Version 2.0.

Copyright 2013 Google

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->`;

/**
 * Outputs the given SVG Element as a string
 * @param {HTMLElement} svg
 * @param {Boolean} skipLicense whether to add the license for the fonts
 * @returns {String} serialized svg element
 */
const getSvgContent = (svg, skipLicense) => {
    // Get svg source
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);

    // Add name spaces
    if (
        !source.match(
            /^<svg[^>]*?\sxmlns=(['"`])https?:\/\/www\.w3\.org\/2000\/svg\1/
        )
    ) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (
        !source.match(
            /^<svg[^>]*?\sxmlns:xlink=(['"`])http:\/\/www\.w3\.org\/1999\/xlink\1/
        )
    ) {
        source = source.replace(
            /^<svg/,
            '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
        );
    }

    // Add xml declaration
    source = `<?xml version="1.0" standalone="no"?>${skipLicense ? '' : `\r\n${LICENSE}`}\r\n${source}`;

    return source;
};

/**
 * Sets the fill style on a given element
 * @param {HTMLElement} element
 * @param {String} fillStyle can be any valid valid for the CSS `fill` property
 * @returns {void}
 */
const setElementFill = (element, fillStyle = 'none') => {
    element.style.fill = fillStyle;
};

/**
 * Removes all elements that fullfil the predicate function.
 * NOTE: The function does not apply the predicate to the children of each elements
 *
 * @param {Array<HTMLElement>} elements
 * @param {Function} predicateFn
 * @returns {void}
 */
const removeElements = (elements, predicateFn = () => true) => {
    elements.forEach(el => {
        if (predicateFn(el)) {
            el.parentNode.removeChild(el);
        }
    });
};

/**
 * Obtains a clone of the provided SVG element. Adding it to the DOM
 * as a child of a hidden parent. We add it to the DOM so that we can
 * get the browser to calculate computed styles
 *
 * @typedef {Object} ReturnType
 * @property {HTMLElement} svgClone the SVG element clone
 * @property {Function} teardown a function that can be called to clean up the DOM after we're done using the clone
 *
 * @param {HTMLElement} element
 * @returns {ReturnType}
 */
const getSVGElementClone = (element) => {
    const div = document.createElement('div');
    div.id = 'NODE_PREVIEW_CONTAINER';

    const svgClone = element.cloneNode(true);

    // in order for `getComputedStyle` to work, we need the clone to be part of the
    // DOM Tree.
    div.appendChild(svgClone);
    div.style.visibility = 'hidden';
    div.style.display = 'table';
    div.style.position = 'absolute';
    document.body.appendChild(div);

    const teardown = () => {
        document.body.removeChild(div);
    };

    return { svgClone, teardown };
};

/**
 * Updates the viewBox property on the SVG element by using the same size as
 * the workflow sheet (actual workspace size)
 *
 * @param {HTMLElement} svgClone
 * @param {HTMLElement} workflowSheet
 * @returns {void}
 */
const updateViewBox = (svgClone, workflowSheet) => {
    const minX = workflowSheet.getAttribute('x');
    const minY = workflowSheet.getAttribute('y');
    const width = workflowSheet.getAttribute('width');
    const height = workflowSheet.getAttribute('height');

    svgClone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
};

/**
 * NOTE: We only add the properties we're interested in inheriting from CSS classes.
 * See: `useCSSfromComputedStyles`
 */
const inheritedCssProperties = [
    'box-sizing',
    'width',
    'height',
    'inline-size',
    'block-size',
    'stroke',
    'stroke-width',
    'font-family',
    'font-style',
    'font-weight',
    'line-height',
    'font-size',
    'text-align',

    // properties needed for correct text clipping on node names
    'display',
    'overflow-x',
    'overflow-y',
    'word-wrap',
    'text-overflow',
    '-webkit-line-clamp',
    '-webkit-box-orient'
];

/**
 * @callback ElementCallback
 * @param {HTMLElement} element
 * @returns {void}
 */
/**
 * Returns a callback function that will apply all computed styles to an element. Said callback will set the styles
 * (derived from CSS classes) as directly inlined styles to the element and will override values based on the provided
 * (optional) `styleOverrides` parameter.
 * It will recursively also run the same behavior for all of the element's children
 *
 * @param {CSSStyleDeclaration} [styleOverrides] Style overriders
 * @returns {ElementCallback}
 */
const useCSSfromComputedStyles = (styleOverrides = {}) => (element) => {
    // run the same behavior for all the element's children
    element.childNodes.forEach((child, index) => {
        if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
            useCSSfromComputedStyles(styleOverrides)(child);
        }
    });

    const compStyles = getComputedStyle(element);

    if (compStyles.length > 0) {
        for (let i = 0; i < compStyles.length; i++) {
            const compStyle = compStyles[i];

            if (inheritedCssProperties.includes(compStyle)) {
                const value = styleOverrides[camelCase(compStyle)]
                    ? styleOverrides[camelCase(compStyle)]
                    : compStyles.getPropertyValue(compStyle);

                element.style.setProperty(compStyle, value);
            }
        }
    }
};

/**
 * Returns the base64 encoded contents of the file that will be fetched from the given
 * filepath
 *
 * @param {String} filepath
 * @returns {Promise}
 */
const fileToBase64 = async (filepath) => {
    const dataUrlDeclarationHeaderRegex = /data:.+\/.+;base64,/g;

    const blobContent = await fetch(filepath).then((response) => response.blob());

    return new Promise(resolve => {
        const reader = new FileReader();

        // Read file content on file loaded event
        reader.onload = function (event) {
            resolve(
                // remove data url preceding headers to be left only with the base64 encoded string
                event.target.result.replace(dataUrlDeclarationHeaderRegex, '')
            );
        };

        // Convert data to base64
        reader.readAsDataURL(blobContent);
    });
};

/**
 * Gets base64 string of the fonts used by the SVG preview. It caches the string for
 * further use
 * @returns {Promise<String>}
 */
const getFontData = async () => {
    const fontCacheKey = `workflow-preview-font-${hashCode(robotoCondensed)}`;
    const cachedFont = localStorage.getItem(fontCacheKey);

    if (cachedFont) {
        return Promise.resolve(cachedFont);
    }

    const fontBase64 = await fileToBase64(robotoCondensed);
    localStorage.setItem(fontCacheKey, fontBase64);

    return fontBase64;
};

/**
 * Appends a style tag in the SVG defs that will contain the required fonts
 * as a base64 data-url
 *
 * @param {HTMLElement} svgElement
 * @returns {void}
 */
const addFontStyles = async (svgElement) => {
    const styleTag = document.createElement('style');

    const fontBase64 = await getFontData();

    styleTag.appendChild(
        document.createTextNode(`@font-face {
            font-family: "Roboto Condensed";
            src: url("data:application/font-woff;charset=utf-8;base64,${fontBase64}");
        }`)
    );

    styleTag.type = 'text/css';

    svgElement.getElementsByTagName('defs')[0].appendChild(styleTag);
};

/**
 * Generate the preview of a workflow based on the provided SVG element which
 * represents the rendered workflow content.
 *
 * @param {HTMLElement} svgElement root workflow SVG element
 * @param {Boolean} isEmpty whether the canvas is empty
 * @returns {String | null} The contents of the root workflow as an SVG string or null when no element is provided
 * as a parameter
 */
export const generateWorkflowPreview = async (svgElement, isEmpty) => {
    if (!svgElement) {
        return null;
    }

    if (isEmpty) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const emptySvg = document.createElementNS(svgNS, 'svg');
        return getSvgContent(emptySvg, true);
    }

    // clone the element so that the original one does not get modified
    const { svgClone, teardown } = getSVGElementClone(svgElement);

    const workflowSheet = svgClone.querySelector('.workflow-sheet');

    // inline custom fonts to the svg element clone
    await addFontStyles(svgClone);

    // set workflow sheet transparency
    setElementFill(workflowSheet, 'transparent');

    // Set the viewbox to only the visible content
    updateViewBox(svgClone, workflowSheet);

    // remove all hover areas elements which are only used for interactivity
    removeElements(svgClone.querySelectorAll('.hover-area'));

    // remove all vue-portals
    removeElements(svgClone.querySelectorAll('DIV.v-portal'));

    // remove all portal-targets
    removeElements(svgClone.querySelectorAll('.vue-portal-target'));

    // remove dynamic port icons
    removeElements(svgClone.querySelectorAll('.add-port'));

    // remove non-connected flow variable port icons
    removeElements(svgClone.querySelectorAll('.mickey-mouse:not(.connected)'));

    // remove empty node labels
    removeElements(svgClone.querySelectorAll('.node-label > .placeholder'));

    // remove all empty g elements
    removeElements(svgClone.querySelectorAll('g'), (node) => !node.hasChildNodes());

    // remove all `display: none` elements
    removeElements(svgClone.querySelectorAll('[style*="display: none"]'));

    // Select connectors and inline all styles that may be only available from classes.
    // Additionally, override strokeWidth in case any connector is highlighted
    svgClone.querySelectorAll('[data-connector-id]').forEach(useCSSfromComputedStyles({
        strokeWidth: '1px'
    }));

    // select `foreignObject`s and inline all styles that may be only available from classes
    svgClone.querySelectorAll('foreignObject').forEach(useCSSfromComputedStyles());

    const output = getSvgContent(svgClone);

    // remove hidden preview container
    teardown();

    return output;
};
