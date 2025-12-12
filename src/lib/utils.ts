import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const removeUndefined = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined);

    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, removeUndefined(v)])
    );
};
