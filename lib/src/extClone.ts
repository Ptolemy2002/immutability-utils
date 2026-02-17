import clone from 'lodash.clone';
import cloneDeep from 'lodash.clonedeep';
import isCallable from 'is-callable';

export type CloneDepth = number | "max";
export type WithCustomClone<T> = { clone(depth?: CloneDepth): T };

// For the purposes of this utility, any object with a callable clone property is considered cloneable.
// This is because checking the argument value is impractical and checking the return value is possibly
// expensive.
function isCustomCloneable<T>(obj: T | WithCustomClone<T>): obj is WithCustomClone<T> {
    return typeof obj === 'object' && obj !== null && "clone" in obj && isCallable(obj.clone);
}

export function satisfiesDepth(depth: CloneDepth, value: number): boolean {
    if (depth === "max") return true;
    if (depth < 0) depth = 0;
    return value <= depth;
}

function _extClone<T>(source: T, remainingDepth: number, seen: WeakMap<object, unknown>): T {
    if (source === null || typeof source !== "object") return source;
    if (seen.has(source)) return seen.get(source) as T;

    // Let lodash handle the shallow copy at this level
    const result = clone(source);
    seen.set(source, result);

    // Walk ALL own keys (enumerable + non-enumerable + symbols)
    // to catch what lodash's clone skips
    for (const key of Reflect.ownKeys(source as object)) {
        const descriptor = Object.getOwnPropertyDescriptor(source, key)!;

        // Skip accessors — keep them as-is but make sure they exist on the clone
        if (!("value" in descriptor)) {
            if (!Object.getOwnPropertyDescriptor(result, key)) {
                Object.defineProperty(result, key, descriptor);
            }
            continue;
        }

        const value = descriptor.value;

        // For object values, recurse with reduced depth
        if (value !== null && typeof value === "object") {
            const clonedValue =
                remainingDepth <= 0
                    ? value
                    : _extClone(value, remainingDepth - 1, seen);

            // Use defineProperty to preserve the original descriptor flags
            // (non-enumerable, non-writable, etc.)
            Object.defineProperty(result, key, {
                ...descriptor,
                value: clonedValue,
            });
        } else if (!Object.getOwnPropertyDescriptor(result, key)) {
            // Primitive on a hidden key that lodash missed
            Object.defineProperty(result, key, descriptor);
        }
    }

    return result;
}

export function extClone<T>(obj: T, depth: CloneDepth, respectCustom=true): T {
    if (respectCustom && isCustomCloneable<T>(obj)) {
        // Let the object handle its own cloning.
        return obj.clone(depth);
    } else if (depth === "max") {
        return cloneDeep(obj);
    } else if (depth === 0) {
        return clone(obj);
    } else {
        return _extClone(obj, depth, new WeakMap());
    }
}