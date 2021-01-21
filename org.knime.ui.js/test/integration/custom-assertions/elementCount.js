/**
 * A custom Nightwatch assertion that tests if a selector matches (at least) a given number of times.
 *
 * @param {String} selector
 * @param {number} count
 * @param {Boolean} allowMore `true` to allow at least `count` matches, `false` to require exactly `count` matches.
 *   Defaults to `false`.
 * @example
 *   nightwatch.assert.elementCount(selector, count); // selector matches exactly `count` times
 *   nightwatch.assert.elementCount(selector, count, true); // selector matches at least `count` times
 * @return {void}
 */
exports.assertion = function elementCount(selector, count, allowMore) {
    const exactly = allowMore ? 'at least' : 'exactly';
    this.message = `Testing if element <${selector}> has ${exactly} count: ${count}`;
    this.expected = count || 0;
    this.pass = allowMore ? val => val >= count : val => val === count;
    this.value = res => res.value;

    let evaluator = function (_selector) {
        return document.querySelectorAll(_selector).length;
    };

    this.command = cb => this.api.execute(evaluator, [selector], cb);
};
