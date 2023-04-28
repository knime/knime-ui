import { computed, ref, type Ref } from 'vue';

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

type UseWorkflowNameValidatorOptions = {
    currentItemId: Ref<string | null>;
    workflowItems: any[];
}

export const useWorkflowNameValidator = (options: UseWorkflowNameValidatorOptions) => {
    const name = ref<string>('');

    const cleanName = (value: string) => value.replace(INVALID_PREFIX, '').replace(INVALID_SUFFIX, '');

    const isValidName = computed(() => {
        const newValue = cleanName(name.value);
        return !INVALID_NAME_CHARACTERS.test(newValue) && newValue.length <= NAME_CHAR_LIMIT;
    });

    const isNameAvailable = computed(() => {
        const itemsWithNameCollision = options.workflowItems.filter(
            (workflow) => workflow.name === name.value && workflow.id !== options.currentItemId.value
        );

        return itemsWithNameCollision.length === 0;
    });

    const isValid = computed(() => isValidName.value && isNameAvailable.value);

    const errorMessage = computed(() => {
        if (!isValidName.value) {
            return 'Name contains invalid characters *?#:"&lt;>%~|/ or exceeds 255 characters';
        }

        if (!isNameAvailable.value) {
            return `Name is already taken by another workflow in the active space`;
        }

        return '';
    });

    return {
        name,
        isValid,
        errorMessage,
        cleanName
    };
};

