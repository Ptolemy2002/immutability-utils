import isCallable from 'is-callable';
import { extClone, CloneDepth, WithCustomClone } from './extClone';

export * from './extClone';

export type ImmutableRef<T> = {
    readonly current: T, enabled: boolean, depth: CloneDepth, respectCustom: boolean,
    nonMutatingKeys: PropertyKey[],
    cloneListeners: Array<(imRef: ImmutableRef<T>) => void>
};

export function isGetter(target: unknown, prop: PropertyKey): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(target, prop);

    if (!!descriptor) {
        return isCallable(descriptor.get);
    } else if (target !== null) {
        // go up the prototype chain
        const proto = Object.getPrototypeOf(target);
        if (proto) {
            return isGetter(proto, prop);
        }
    }

    return false;
}

// A hack so that we don't have to use ts-ignore all over the place.
// The property should be readonly to the outside world, but we need
// to be able to update it internally.
function setCurrent<T>(imRef: ImmutableRef<T>, value: T) {
    // @ts-ignore
    imRef.current = value;
}

export function immutable<T extends object>(
    obj: T, depth: CloneDepth = "max",
    nonMutatingKeys: PropertyKey[] = [],
    respectCustom=true
): ImmutableRef<T> {
    const imRef: ImmutableRef<T> = { current: obj, enabled: true, cloneListeners: [], depth, respectCustom, nonMutatingKeys };

    // Wrap in a Proxy to override mutations
    function applyProxy(target: T): T {
        return new Proxy(target, {
            get(o, prop, receiver) {
                if (!imRef.enabled) return Reflect.get(o, prop, receiver);
                const isNonMutating = imRef.nonMutatingKeys.includes(prop);
                
                // We have been told this is a non-mutating key, so we can
                // skip the cloning and just return the value directly.
                if (isNonMutating || prop === 'clone') {
                    return Reflect.get(o, prop, receiver);
                }
                
                const get = isGetter(o, prop);
                if (get) {
                    // The getter could mutate the object, so we need to clone it first
                    const cloned = extClone(o, imRef.depth, imRef.respectCustom);

                    // Disable for the duration of this call (it could be a getter that triggers more mutations).
                    // All mutations in this call will be treated
                    // as one mutation.
                    let result;
                    try {
                        imRef.enabled = false;
                        result = Reflect.get(cloned, prop, receiver);
                    } finally {
                        imRef.enabled = true;
                    }
                    
                    // Sync the reference to the new cloned object
                    // and reapply the proxy
                    setCurrent(imRef, applyProxy(cloned));

                    for (const listener of imRef.cloneListeners) {
                        listener(imRef);
                    }

                    return result;
                }

                const value = Reflect.get(o, prop, receiver);
                const isFunction = isCallable(value);
                if (isFunction) {
                    // The function could mutate the object, so we need to clone it first
                    return function (...args: any[]) {
                        const cloned = extClone(o, imRef.depth, imRef.respectCustom);

                        // Disable for the duration of this call.
                        // All mutations in this call will be treated
                        // as one mutation.
                        let result;
                        try {
                            imRef.enabled = false;
                            result = cloned[prop](...args);
                        } finally {
                            imRef.enabled = true;
                        }

                        // Sync the reference to the new cloned object
                        // and reapply the proxy
                        setCurrent(imRef, applyProxy(cloned));

                        for (const listener of imRef.cloneListeners) {
                            listener(imRef);
                        }

                        return result;
                    };
                }

                return value;
            },

            set(o, prop, value, receiver) {
                if (!imRef.enabled) return Reflect.set(o, prop, value, receiver);

                // On any mutation, clone the object first.
                const cloned = extClone(o, imRef.depth, imRef.respectCustom);

                // Disable for the duration of this call (it could be a setter that triggers more mutations).
                // All mutations in this call will be treated
                // as one mutation.
                let result;
                try {
                    imRef.enabled = false;
                    result = Reflect.set(cloned, prop, value, cloned);
                } finally {
                    imRef.enabled = true;
                }

                // Sync the reference to the new cloned object
                // and reapply the proxy
                setCurrent(imRef, applyProxy(cloned));

                for (const listener of imRef.cloneListeners) {
                    listener(imRef);
                }

                return result;
            }
        });
    }

    setCurrent(imRef, applyProxy(imRef.current));

    return imRef;
}

export function immutableMut<T>(value: T, cb: (v: T) => void, respectCustom = true): T {
    const clone = extClone(value, "max", respectCustom);
    cb(clone);
    return clone;
}