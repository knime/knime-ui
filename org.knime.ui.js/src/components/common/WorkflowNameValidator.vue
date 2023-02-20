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
        },
        currentItemId: {
            type: String,
            required: false,
            default: null
        },
        workflowItems: {
            type: Array,
            required: false,
            default() {
                return [];
            }
        }
    },
    computed: {
        isValidName() {
            const newValue = this.cleanName(this.renameValue);
            return !INVALID_NAME_CHARACTERS.test(newValue) && newValue.length <= NAME_CHAR_LIMIT;
        },
        isNameAvailable() {
            const itemsWithNameCollision = this.workflowItems.filter(
                (workflow) => workflow.name === this.name && workflow.id !== this.currentItemId
            );
            return itemsWithNameCollision.length === 0;
        },
        isValid() {
            return this.isValidName && this.isNameAvailable;
        },
        errorMessage() {
            if (!this.isValidName) {
                return 'Name contains invalid characters *?#:"&lt;>%~|/ or exceeds 255 characters';
            }

            if (!this.isNameAvailable) {
                return `Name is already taken by another workflow in the active space`;
            }

            return '';
        }
    },
    watch: {
        isValid() {
            this.$emit('is-valid-changed', this.isValid);
        }
    },
    methods: {
        cleanName(value) {
            return value.replace(INVALID_PREFIX, '').replace(INVALID_SUFFIX, '');
        }
    },
    render() {
        return this.$scopedSlots.default({
            isValid: this.isValid,
            errorMessage: this.errorMessage,
            cleanNameFn: this.cleanName
        });
    }
};
</script>
