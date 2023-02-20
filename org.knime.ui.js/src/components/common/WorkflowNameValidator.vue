<script>

const INVALID_NAME_CHARACTERS = /[*?#:"<>%~|/\\]/;
/**
 * "/", "\" and "." are non-valid preffixes and will be auto-removed
 */
const INVALID_PREFIX = /^(\.)+|^(\\)+|^(\/)+/;
/**
 * "/", "\" and "." are non-valid suffixes and will be auto-removed
 */
const INVALID_SUFFIX = /(\.)+$|(\\)+$|(\/)+$/;

const NAME_CHAR_LIMIT = 255;

export default {
    props: {
        name: {
            type: String,
            required: true
        }
    },
    computed: {
        isValidName() {
            const newValue = this.removeInvalidPreOrSuffix(this.renameValue);
            return !INVALID_NAME_CHARACTERS.test(newValue) && newValue.length <= NAME_CHAR_LIMIT;
        }
    },
    methods: {
        cleanName(value) {
            return value.replace(INVALID_PREFIX, '').replace(INVALID_SUFFIX, '');
        }
    },
    render() {
        return this.$scopedSlots.default({
            isValid: this.isValidName,
            cleanNameFn: this.cleanName
        });
    }
};
</script>
