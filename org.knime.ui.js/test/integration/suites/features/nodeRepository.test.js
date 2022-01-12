const { sidebarMenu } = require('../../plugins/locators');

Feature('Node repository').tag('@features-@NodeRepository');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-globalToolbarAndStatusChange');
    I.seeElement({ sidebarMenu: sidebarMenu.NODE_REPOSITORY });
    I.click({ sidebarMenu: sidebarMenu.NODE_REPOSITORY });
});

Scenario('Show more nodes of an specific Category', ({ I }) => {
    I.see('Table Creator');
    I.dontSee('Create Table Structure');
    I.click('More "IO" nodes');
    I.see('Create Table Structure');
    I.dontSee('Send Email');
    I.click('Show more…');
    I.see('Send Email');
});

Scenario('Show more nodes of an specific Category using Category title button', ({ I }) => {
    I.see('Table Creator');
    I.dontSee('Create Table Structure');
    I.click('IO', '.category-title');
    I.see('Create Table Structure');
    I.dontSee('Send Email');
    I.click('Show more…');
    I.see('Send Email');
});

Scenario('User compound (and) filter', ({ I }) => {
    const READ_TAG_SELECTOR = '#left-panel div.header > div.closeable-tags > div > div > span:nth-child(2)';
    I.see('Table Creator');
    I.click('More "IO" nodes');
    I.see('ARFF Reader');
    I.click(READ_TAG_SELECTOR);
    I.dontSee('ARFF Reader');
    I.see('Table Creator');
});

Scenario('Clear tag selection using Repository link', ({ I }) => {
    const REPO_BREADCRUMB_LINK_SELECTOR = '.repo-breadcrumb a[href="/#clear"]';
    I.see('Table Creator');
    I.see('Row Filter');
    I.click('More "IO" nodes');
    I.see('Table Creator');
    I.dontSee('Row Filter');
    I.click(REPO_BREADCRUMB_LINK_SELECTOR);
    I.see('Row Filter');
});

Scenario('Clear tag selection using deselect tag', ({ I }) => {
    const SELECTED_TAG_SELECTOR = '#left-panel div.header > div.closeable-tags span.tag.clickable.selected';
    I.see('Table Creator');
    I.see('Row Filter');
    I.click('More "IO" nodes');
    I.see('Table Creator');
    I.dontSee('Row Filter');
    I.click('IO', SELECTED_TAG_SELECTOR);
    I.see('Row Filter');
});

Scenario('Show more tags selection', ({ I }) => {
    I.click('More "IO" nodes');
    I.dontSee('Connectors', '.tag.clickable');
    I.seeElement('span.more-tags.tag');
    I.click('span.more-tags.tag');
    I.see('Connectors', '.tag.clickable');
});

Scenario('Close open more tags overlay', ({ I }) => {
    I.click('More "IO" nodes');
    I.dontSee('R', '.tag.clickable');
    I.seeElement('span.more-tags.tag');
    I.click('span.more-tags.tag');
    I.see('R', '.tag.clickable');
    I.click('button.tags-popout-close');
    I.dontSee('R', '.tag.clickable');
});

Scenario('Lazy loading Categories', ({ I }) => {
    const scrolledY = 1300;
    const scrollerSelector = '#left-panel > div > div > div ';
    I.seeElement(scrollerSelector);
    I.dontSee('Structured Data', '.category-title');
    I.dontSee('XPath');
    I.scroll(scrollerSelector, scrolledY);
    I.see('Structured Data', '.category-title');
    I.see('XPath');
});

Scenario('Single search node', ({ I }) => {
    I.seeElement('#node-search');
    I.fillField('#node-search > input[type=text]', 'table');
    I.see('Table Creator');
    I.see('JSON to Table');
    I.click('#node-search > button[data-test-clear-search]');
    I.see('Table Creator');
    I.dontSee('JSON to Table');
});
