#!/usr/bin/env node

/**
 * Simple helper function to inline scripts and stylesheets into `index.html`.
 * It creates a file named `inlined.html`.
 */

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

const __dirname = dirname(fileURLToPath(import.meta.url));

const distFolder = path.join(__dirname, '..', 'dist');

const html = fs.readFileSync(path.join(distFolder, 'index.html'));
let dom = new JSDOM(html);

let { window: { document }} = dom;

/*
* remove preload optimizations. They are not required for inlined resources.
*/
let preloads = [...document.querySelectorAll('[rel="preload"]')];
preloads.forEach(node => node.remove());

/*
* inline stylesheets
*/
let stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')];
stylesheets.forEach(linkTag => {
    let href = linkTag.href;
    let styles = fs.readFileSync(path.resolve(distFolder, href.replace(/^\//, '')));
    let inlinedTag = document.createElement('style');
    inlinedTag.textContent = styles;
    linkTag.parentNode.replaceChild(inlinedTag, linkTag);
});

/*
* inline scripts
*/
let scripts = [...document.querySelectorAll('script[src]')];
scripts.forEach(externalScriptTag => {
    let src = externalScriptTag.src;
    let script = fs.readFileSync(path.resolve(distFolder, src.replace(/^\//, '')));
    let inlinedTag = document.createElement('script');
    inlinedTag.textContent = script;
    externalScriptTag.parentNode.replaceChild(inlinedTag, externalScriptTag);
});

/*
* generate output
*/
let result = dom.serialize();

fs.writeFileSync(path.resolve(distFolder, 'inlined.html'), result);
