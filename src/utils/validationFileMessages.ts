import { Labels } from "src/types/label";
import { getLabel } from "./labelUtil"

export const validationMessages = {
    typeNotAllowed: (file: File, labels: Labels) => 
        getLabel('validation.type_not_allowed', labels, { name: file.name }),
    sizeExceeded: (file: File, labels: Labels, maxSizeMb: number) => 
        getLabel('validation.size_exceeded', labels, { name: file.name, size: (file.size / 1024 / 1024).toFixed(2), maxSize: maxSizeMb }), 
};
