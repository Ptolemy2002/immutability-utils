# Immutability Utils
A TypeScript library that wraps mutable values and makes them immutable using proxies and cloning. This library allows you to work with classes designed with a mutable API while automatically maintaining immutability through copy-on-write semantics.

The library, for performance and simplicity purposes, assumes that any object with a callable `clone` method is one where that method takes exactly one optional parameter (the clone depth), returns the same type as the object itself, and does not perform any mutations on the original object. If these assumptions are not met, the library may not work correctly.

## Type Reference
```typescript
type CloneDepth = number | "max";
type WithCustomClone<T> = { clone(depth?: CloneDepth): T };
type ImmutableRef<T> = {
    readonly current: T, enabled: boolean, depth: CloneDepth, respectCustom: boolean,
    nonMutatingKeys: PropertyKey[],
    cloneListeners: Array<(imRef: ImmutableRef<T>) => void>
};
```

## Functions
The following functions are exported by the library:

### satisfiesDepth
```typescript
function satisfiesDepth(depth: CloneDepth, value: number): boolean
```
A simple function that checks if a given value satisfies the specified clone depth. If the depth is less than `0`, it will be clamped to `0`. If the depth is `"max"`, the function will always return `true`. Otherwise, it checks if the value is less than or equal to the depth.

#### Parameters
- `depth` (`CloneDepth`): The clone depth to check against.
- `value` (`number`): The value to check against the clone depth.

### depthIncrement
```typescript
function depthIncrement(depth: CloneDepth, value: number = 1): CloneDepth
```
Increments the given clone depth by the specified value. If the depth is `"max"`, it will remain `"max"`. If the resulting depth is less than `0`, it will be clamped to `0`.

#### Parameters
- `depth` (`CloneDepth`): The current clone depth.
- `value` (`number`, optional): The value to increment the depth by. Defaults to `1`.

### depthDecrement
```typescript
function depthDecrement(depth: CloneDepth, value: number = 1): CloneDepth
```
Decrements the given clone depth by the specified value. If the depth is `"max"`, it will remain `"max"`. If the resulting depth is less than `0`, it will be clamped to `0`.

#### Parameters
- `depth` (`CloneDepth`): The current clone depth.
- `value` (`number`, optional): The value to decrement the depth by. Defaults to `1`.

### extClone<T>
```typescript
function extClone<T>(value: T, depth: CloneDepth = "max", respectCustom = true): T
```
Extends the two `lodash` cloning functions by adding support for custom clone methods and clone depth. If the value has a callable `clone` method and `respectCustom` is `true`, it will use that method to clone the value. Otherwise, it will use `lodash.clone` directly if the depth is `0`, `lodash.clonedeep` if the depth is `"max"`, or repeated `lodash.clone` calls if the depth is a positive number.

#### Parameters
- `value` (`T`): The value to clone.
- `depth` (`CloneDepth`, optional): The depth to clone. Defaults to `"max"`.
- `respectCustom` (`boolean`, optional): Whether to respect custom clone methods. Defaults to `true`.

### isGetter
```typescript
function isGetter(target: unknown, prop: PropertyKey): boolean
```
Checks if the given property is a getter on the target object. Used internally to determine if a property access could potentially mutate the object.

#### Parameters
- `target` (`unknown`): The object to check for the getter property.
- `prop` (`PropertyKey`): The property key to check.

### immutableMut<T>
```typescript
function immutableMut<T>(value: T, cb: (v: T) => void, respectCustom = true): T
```
A utility function that allows you to perform mutations on a value while maintaining immutability. It clones the value, passes the clone to the provided callback for mutation, and then returns the mutated clone.

#### Parameters
- `value` (`T`): The value to clone and mutate.
- `cb` (`(v: T) => void`): A callback function that receives the cloned value for mutation.
- `respectCustom` (`boolean`, optional): Whether to respect custom clone methods. Defaults to `true`.

### immutable<T extends object>
```typescript
function immutable<T extends object>(
    obj: T, depth: CloneDepth = "max",
    nonMutatingKeys: PropertyKey[] = [],
    respectCustom=true
): ImmutableRef<T>
```
Wraps the given object in a proxy that enforces immutability by cloning the object whenever a mutation is expected. That is:
- Whenever a property is set, if the reference is enabled, the object will be cloned, the property will be set on the clone, and `ref.current` will be updated to the clone.
- Whenever a property is accessed, if the reference is enabled, the property is not in the `nonMutatingKeys` list (or is not `clone`), and the property is a getter, the object will be cloned and `ref.current` will be updated to the clone.
- Whenever a property is accessed, if the reference is enabled, the property is not in the `nonMutatingKeys` list (or is not `clone`), and the property value is a function, the function will be wrapped in another function that clones the object and updates `ref.current` to the clone before making the call with the same arguments.

Note that the reference will be disabled during the execution of any getter, setter, or function call, so the reference to `this` remains correct for the duration of that operation and any mutations that occur during that operation will be batched.

After any operation is done, all listeners in `ref.cloneListeners` will be called with the reference as an argument, so you can subscribe to changes by adding a listener to that array.

#### Parameters
- `obj` (`T`): The initial object to wrap in the immutable proxy.
- `depth` (`CloneDepth`, optional): The initial clone depth to use for the reference. Defaults to `"max"`.
- `respectCustom` (`boolean`, optional): The initial value for whether to respect custom clone methods. Defaults to `true`.
- `nonMutatingKeys` (`PropertyKey[]`, optional): An initial array of property keys that should be considered non-mutating, meaning that accessing them will not trigger cloning. Defaults to an empty array. Note that the `clone` property is always considered non-mutating regardless of whether it is included in this array or not.

All of these parameters (except for `obj`) are also mutable properties of the returned reference, so you can change them at any time after the fact.

## Peer Dependencies
- `is-callable`: `^1.2.7`
- `lodash.clone`: `^4.5.0`
- `lodash.clonedeep`: `^4.5.0`

## Commands
The following commands exist in the project:

- `npm run uninstall` - Uninstalls all dependencies for the library
- `npm run reinstall` - Uninstalls and then Reinstalls all dependencies for the library
- `npm run example-uninstall` - Uninstalls all dependencies for the example app
- `npm run example-install` - Installs all dependencies for the example app
- `npm run example-reinstall` - Uninstalls and then Reinstalls all dependencies for the example app
- `npm run example-start` - Starts the example app after building the library
- `npm run build` - Builds the library
- `npm run release` - Publishes the library to npm without changing the version
- `npm run release-patch` - Publishes the library to npm with a patch version bump
- `npm run release-minor` - Publishes the library to npm with a minor version bump
- `npm run release-major` - Publishes the library to npm with a major version bump