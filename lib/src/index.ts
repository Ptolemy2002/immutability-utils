import isCallable from 'is-callable';
import { Override } from '@ptolemy2002/ts-utils';

export type Cloneable<T=object> = Override<T, { clone(): Cloneable<T> }>;
export type ImmutableRef<T=object> = {
    current: Cloneable<T>, enabled: boolean,
    cloneListeners: Array<(imRef: ImmutableRef<T>) => void>
};

export function immutable<T>(obj: Cloneable<T>): ImmutableRef<T> {
    const imRef: ImmutableRef<T> = { current: obj, enabled: true, cloneListeners: [] };

    // Wrap in a Proxy to override mutations
    function applyProxy(target: Cloneable<T>): Cloneable<T> {
        return new Proxy(target, {
            get(o, prop, receiver) {
                const value = Reflect.get(o, prop, receiver);
                if (!imRef.enabled) return value;

                const isFunction = isCallable(value);
                if (isFunction && prop !== 'clone') {
                    // The function could mutate the object, so we need to clone it first
                    return function (...args: any[]) {
                        const cloned = o.clone();

                        // Disable for the duration of this call.
                        // All mutations in this call will be treated
                        // as one mutation.
                        imRef.enabled = false;
                        const result = cloned[prop](...args);
                        imRef.enabled = true;

                        // Sync the reference to the new cloned object
                        // and reapply the proxy
                        imRef.current = applyProxy(cloned);

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
                const cloned = o.clone();

                // Disable for the duration of this call (it could be a setter that triggers more mutations).
                // All mutations in this call will be treated
                // as one mutation.
                imRef.enabled = false;
                const result = Reflect.set(cloned, prop, value, cloned);
                imRef.enabled = true;

                // Sync the reference to the new cloned object
                // and reapply the proxy
                imRef.current = applyProxy(cloned);

                for (const listener of imRef.cloneListeners) {
                    listener(imRef);
                }

                return result;
            }
        });
    }

    imRef.current = applyProxy(imRef.current);

    return imRef;
}

export function immutableMut<T>(value: Cloneable<T>, cb: (v: Cloneable<T>) => void): Cloneable<T> {
    const clone = value.clone();
    cb(clone);
    return clone;
}