import { Labels } from "src/types/label";

const getLabel = (key: string, labels: Labels, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = labels;
    for (const k of keys) {
        if (typeof value !== 'object' || value === null) 
            return key;
        value = value[k];
    }

    if (typeof value === 'string' && params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
            value = value.replace(`{${paramKey}}`, String(paramValue));
        });
    }

    return typeof value === 'string' ? value : key;
};

export {
    getLabel
}