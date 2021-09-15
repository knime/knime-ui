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
    I.see('Table Creator');
    I.click('More "IO" nodes');
    I.see('ARFF Reader');
    I.click({ nodeCategoryTag: 'Read' });
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
    I.see('Table Creator');
    I.see('Row Filter');
    I.click('More "IO" nodes');
    I.see('Table Creator');
    I.dontSee('Row Filter');
    I.click({ nodeCategoryTag: 'IO' });
    I.see('Row Filter');
});

Scenario('Show more tags selection', ({ I }) => {
    I.dontSeeElement({ nodeCategoryTag: 'Weka' });
    I.click('More "IO" nodes');
    I.seeElement('span.more-tags.tag');
    I.click('span.more-tags.tag');
    I.seeElement({ nodeCategoryTag: 'Weka' });
});

Scenario('Lazy loading Categories', ({ I }) => {
    const scrolledHeight = 20;
    I.seeElement('.panel > .container');
    I.dontSee('Analytics', '.category-title');
    I.dontSee('Statistics');
    I.scroll('.panel > .container', scrolledHeight);
    I.see('Analytics', '.category-title');
    I.see('Statistics');
});
