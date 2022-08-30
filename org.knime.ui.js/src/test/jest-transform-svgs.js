// from https://github.com/damianstasik/vue-svg-loader/issues/38#issuecomment-1135337194
const VueTemplateCompiler = require('vue-template-compiler');

module.exports.process = (svgSource, filename) => {
    const result = VueTemplateCompiler.compileToFunctions(
        `${svgSource}`
    );

    return {
        code: `module.exports = { render: ${result.render} }`
    };
};
