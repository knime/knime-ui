// Configuration for security audit.
// This allows to add exceptions for security issues found in npm modules that don't affect us.
// Consider adding a comment with an explanation why each entry is added
module.exports = {
    // Enter exclusions below, for example
    // '1548|nuxt>@nuxt/core>@nuxt/vue-renderer>vue-server-renderer>serialize-javascript'
    // would whitelist issue https://www.npmjs.com/advisories/1548 in serialize-javascript
    // for the given dependency path.
    // Please refer to the https://www.npmjs.com/package/audit-ci README for details.
    // Remember to add a comment explaining why the exclusion was added.
    allowlist: [
        
    ],
    low: true,
    'package-manager': 'npm'
};
