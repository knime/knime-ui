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
    I.dontSee('Model Reader');
    I.click('Show more...');
    I.see('Model Reader');
});

Scenario('Show more nodes of an specific Category using Category title button', ({ I }) => {
    I.see('Table Creator');
    I.dontSee('Create Table Structure');
    I.click('IO', '.category-title');
    I.see('Create Table Structure');
    I.dontSee('Model Reader');
    I.click('Show more...');
    I.see('Model Reader');
});

Scenario('User compound (and) filter', ({ I }) => {
    const READ_TAG_SELECTOR = '#left-panel > div > div > div > div.tags > div > span:nth-child(4)';
    I.see('Table Creator');
    I.click('More "IO" nodes');
    I.see('ARFF Reader');
    I.click(READ_TAG_SELECTOR);
    I.dontSee('Table Creator');
    I.see('ARFF Reader');
});

Scenario('Clear tag selection using Clear Button', ({ I }) => {
    I.see('Table Creator');
    I.see('Row Filter');
    I.click('More "IO" nodes');
    I.see('Table Creator');
    I.dontSee('Row Filter');
    I.click('Clear', '.clear-button');
    I.see('Row Filter');
});

Scenario('Clear tag selection using deselect tag', ({ I }) => {
    const SELECTED_TAG_SELECTOR = '#left-panel > div > div > div > div:nth-child(5) > div > div > span';
    I.see('Table Creator');
    I.see('Row Filter');
    I.click('More "IO" nodes');
    I.see('Table Creator');
    I.dontSee('Row Filter');
    I.click('IO', SELECTED_TAG_SELECTOR);
    I.see('Row Filter');
});

Scenario('Show more tags selection', ({ I }) => {
    I.dontSee('.tag.clickable');
    I.click('More "IO" nodes');
    I.seeElement('span.more-tags.tag');
    I.click('span.more-tags.tag');
    I.see('Weka', '.tag.clickable');
});

Scenario('Lazy loading Categories', ({ I }) => {
    const scrolledY = 400;
    I.seeElement('.panel > .container');
    I.dontSee('Analytics', '.category-title');
    I.dontSee('Statistics');
    I.scroll('.panel > .container', scrolledY);
    I.see('Analytics', '.category-title');
    I.see('Statistics');
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
