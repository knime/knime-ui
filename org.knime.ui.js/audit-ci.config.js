// Configuration for security audit.
// This allows to add exceptions for security issues found in npm modules that don't affect us.
// Consider adding a comment with an explanation why each entry is added
module.exports = {
    allowlist: [
        // Issue 1548 affects only the server-side renderer which is not used by this project
        '1548|nuxt>@nuxt/core>@nuxt/server>@nuxt/vue-renderer>vue-server-renderer>serialize-javascript',
        '1548|nuxt>@nuxt/core>@nuxt/vue-renderer>vue-server-renderer>serialize-javascript'
    ],
    low: true,
    'package-manager': 'npm'
};
