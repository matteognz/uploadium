import { FileValidationError } from "src/types/file";
import { validationMessages } from "./validationFileMessages";
import { Labels } from "src/types/label";

const validateFile = (file: File, labels: Labels, accept?: string[], maxSizeMb?: number) : FileValidationError | null => {
    if (accept && !accept.some(type => file.type === type)) 
        return { file, reason: validationMessages.typeNotAllowed(file, labels)};
    if (maxSizeMb && (file.size > maxSizeMb * 1024 * 1024)) 
        return { file, reason: validationMessages.sizeExceeded(file, labels, maxSizeMb)};
    return null;
};

const generateId = (): string => {
    if ('randomUUID' in crypto) return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export {
    validateFile,
    generateId
}