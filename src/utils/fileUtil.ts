const isValidFile = (file: File, accept?: string[], maxSizeMb?: number) => {
    if (accept && !accept.includes(file.type)) return false;
    if (maxSizeMb && (file.size > maxSizeMb * 1024 * 1024)) return false;
    return true;
};

const generateId = (): string => {
    if ('randomUUID' in crypto) return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export {
    isValidFile,
    generateId
}