/**
 * Normalize a given styleRange list:
 * 1. handle empty list
 * 2. return fallback if format is not supported (overlapping ranges)
 * 3. fill gaps between ranges
 * @param {Array} styleRanges
 * @param {String} text
 * @return {{ normalized: Array, isValid: boolean }}
 *   Normalized styleRange array, and a flag indicating whether the input range was valid
 *
 * @example
 * normalize([{ start: 1, length: 2 }], 'foobarbaz') === {
 *   normalized: [
 *     { start: 0, length: 1 }, // gaps filled
 *     { start: 1, length: 2 },
 *     { start: 3, length: 6 }  // gaps filled
 *   ],
 *   isValid: true
 * }
 *
 * @example
 * normalize([{ start: 1, length: 7 }, { start: 4, length: 8 }], 'foobarbaz') === { // invalid
 *   normalized: [ { start: 0, length: 9 } ], // fallback
 *   isValid: false
 * }
 */
const normalize = (styleRanges, text) => {
    const getFallback = () => [{ start: 0, length: text.length }];

    let normalized = JSON.parse(JSON.stringify(styleRanges));
    normalized.sort(({ start }, { start: start2 }) => start - start2);

    // handle empty string
    if (!text) {
        return { normalized: [], isValid: normalized.length === 0 };
    }

    // handle empty range list
    if (normalized.length === 0) {
        return {
            normalized: getFallback(),
            isValid: true
        };
    }

    // validate overlapping ranges (not supported)
    for (let i = 0; i < normalized.length; i++) {
        let range = normalized[i];
        let nextRange = normalized[i + 1];
        if (
            typeof range.length !== 'number' || typeof range.start !== 'number' ||
            range.start < 0 || range.start + range.length > text.length ||
            (nextRange && (range.start + range.length > nextRange.start)) // eslint-disable-line no-extra-parens
        ) {
            return {
                normalized: getFallback(),
                isValid: false
            };
        }
    }

    // fill gap at start
    if (normalized[0].start !== 0) {
        normalized.unshift({
            start: 0,
            length: normalized[0].start
        });
    }

    // fill gaps in between
    normalized = normalized.reduce((result, range) => {
        let lastRange = result[result.length - 1];
        if (lastRange) {
            let lastEnd = lastRange.start + lastRange.length;
            if (lastEnd < range.start) {
                result.push({
                    start: lastEnd,
                    length: range.start - lastEnd
                });
            }
        }
        result.push(range);
        return result;
    }, []);

    // fill gap at end
    let lastRange = normalized[normalized.length - 1];
    let lastEnd = lastRange.start + lastRange.length;
    if (lastEnd < text.length) {
        normalized.push({
            start: lastEnd,
            length: text.length - lastEnd
        });
    }

    return {
        normalized,
        isValid: true
    };
};

/**
 * Apply styleRanges to a given text
 * @param {Array} styleRanges
 * @param {string} text
 * @return {{ textRanges: Array, isValid: boolean }}
 *   An array of text chunks with style info, and a flag indicating whether the input was valid
 *
 * @example
 * applyStyleRanges([{ start: 1, length: 2, bold: true}, { start: 5, length: 3, color: 'red'}], 'foobarbaz') === {
 *   textRanges: [
 *     { text: 'f' },
 *     { bold: true, text: 'oo' },
 *     { text: 'ba' },
 *     { color: 'red', text: 'rba' },
 *     { text: 'z' }
 *   ],
 *   isValid: true
 * }
 *
 * @example
 * applyStyleRanges([{ start: 5, length: 100, bold: true }], 'foobarbaz') === { // invalid
 *   textRanges: [ { text: 'foobarbaz' } ],
 *   isValid: false
 * }
 */
export const applyStyleRanges = (styleRanges, text) => {
    let { normalized, isValid } = normalize(styleRanges, text);
    let textRanges = normalized.map(styleRange => ({
        ...styleRange,
        text: text.substr(styleRange.start, styleRange.length)
    }));
    textRanges.forEach(range => {
        delete range.start;
        delete range.length;
    });
    return { textRanges, isValid };
};
