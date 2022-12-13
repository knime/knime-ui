import robotoCondensed from '@fontsource/roboto-condensed/files/roboto-condensed-all-700-normal.woff';

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
 * @returns {String} serialized svg element
 */
const getSvgContent = (svg) => {
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
    source = `<?xml version="1.0" standalone="no"?>\r\n${LICENSE}\r\n${source}`;

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
const removeElements = (elements, predicateFn) => {
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
    'font-size'
];

/**
 * Function that, given an element, will apply all the computed styles (derived from css classes)
 * as direct inlined styles to the element. It will recursively also run the same behavior for all
 * the element's children
 *
 * @param {HTMLElement} element
 * @returns {void}
 */
const useCSSfromComputedStyles = (element) => {
    // run the same behavior for all the element's children
    element.childNodes.forEach((child, index) => {
        if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
            useCSSfromComputedStyles(child);
        }
    });
   
    const compStyles = getComputedStyle(element);

    if (compStyles.length > 0) {
        Object.values(compStyles).forEach(compStyle => {
            if (inheritedCssProperties.includes(compStyle)) {
                element.style.setProperty(compStyle, compStyles.getPropertyValue(compStyle));
            }
        });
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
    const fontCacheKey = 'workflow-preview-font';
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
 * @returns {String | null} The contents of the root workflow as an SVG string or null when no element is provided
 * as a parameter
 */
export const generateWorkflowPreview = async (svgElement) => {
    if (!svgElement) {
        return null;
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
    removeElements(svgClone.querySelectorAll('.hover-area'), () => true);
    
    // remove all vue-portals
    removeElements(svgClone.querySelectorAll('DIV.v-portal'), () => true);
    
    // remove all portal-targets
    removeElements(svgClone.querySelectorAll('.vue-portal-target'), () => true);
    
    // remove dynamic port icons
    removeElements(svgClone.querySelectorAll('.add-port'), () => true);
    
    // remove all empty g elements
    removeElements(svgClone.querySelectorAll('g'), (node) => !node.hasChildNodes());
    
    // remove all `display: none` elements
    removeElements(svgClone.querySelectorAll('[style*="display: none"]'), () => true);

    // select connectors and inline all styles that may be only available from classes
    svgClone.querySelectorAll('[data-connector-id]').forEach(useCSSfromComputedStyles);
    
    // select `foreignObject`s and inline all styles that may be only available from classes
    svgClone.querySelectorAll('foreignObject').forEach(useCSSfromComputedStyles);

    const output = getSvgContent(svgClone);
    
    // remove hidden preview container
    teardown();

    return output;
};
