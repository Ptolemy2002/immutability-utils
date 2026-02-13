# Immutability Utils
A TypeScript library that wraps mutable classes and makes them immutable using proxies and cloning. This library allows you to work with classes designed with a mutable API while automatically maintaining immutability through copy-on-write semantics.

## Features

- **Automatic Copy-on-Write**: Any mutation (property assignment or method call) automatically creates a clone of the object
- **Proxy-Based**: Uses JavaScript Proxies to intercept and handle mutations transparently
- **Zero Refactoring**: Works with existing mutable classes without requiring changes to the class implementation
- **Type-Safe**: Full TypeScript support with proper type inference
- **Efficient**: Groups multiple mutations within a single method call into one clone operation
- **Toggle Support**: Can temporarily disable immutability when needed
- **Clone Listeners**: Register callbacks that execute whenever a clone operation occurs

## Requirements

Your class must implement a `clone()` method that returns a deep copy of the instance.

## Usage

### Basic Example

```typescript
import { immutable, ImmutableRef } from '@ptolemy2002/immutability-utils';

class Counter {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    increment(amount: number): Counter {
        this.value += amount;
        return this;
    }

    clone(): Counter {
        return new Counter(this.value);
    }
}

// Create an immutable reference
const counterRef = immutable<Counter>(new Counter(0));

// This creates a new instance with value = 5
counterRef.current.increment(5);
console.log(counterRef.current.value); // 5

// The old instance is preserved
const oldCounter = counterRef.current;
counterRef.current.increment(3);
console.log(oldCounter.value); // 5 (unchanged)
console.log(counterRef.current.value); // 8 (new instance)
```

### How It Works

1. **Method Calls**: When you call a method that might mutate the object, the library first clones the object, then calls the method on the clone, and finally updates the reference to point to the new clone.

2. **Property Assignments**: When you set a property, the library clones the object first, applies the change to the clone, and updates the reference.

3. **Read Operations**: Getters and property reads do not trigger cloning.

4. **Chained Calls**: Multiple mutations within a single method call are treated as one mutation (only one clone is created).

### Advanced Features

#### Temporarily Disable Immutability

```typescript
const dataRef = immutable<MyClass>(new MyClass());

// Disable immutability temporarily
dataRef.enabled = false;
dataRef.current.someProperty = "mutated in place"; // No clone created
dataRef.enabled = true;
```

#### Clone Listeners

You can register listeners that will be called whenever a clone operation occurs. This is useful for tracking changes, updating UI, or triggering side effects.

```typescript
const counterRef = immutable<Counter>(new Counter(0));

// Add a listener that logs whenever a clone occurs
counterRef.cloneListeners.push((imRef) => {
    console.log('Clone occurred! New value:', imRef.current.value);
});

// This will trigger the listener
counterRef.current.increment(5); // Logs: "Clone occurred! New value: 5"
counterRef.current.increment(3); // Logs: "Clone occurred! New value: 8"
```

**Use Cases for Clone Listeners:**
- Triggering React state updates when working with immutable data structures
- Logging or debugging mutation operations
- Synchronizing changes to external systems
- Implementing undo/redo functionality

## API Reference

### Types

#### `Cloneable<T>`

A type representing an object that can be cloned. It's essentially `T` with a `clone()` method that returns `Cloneable<T>`.

```typescript
type Cloneable<T=object> = Override<T, { clone(): Cloneable<T> }>;
```

#### `ImmutableRef<T>`

A reference object containing the current immutable instance and an enabled flag.

```typescript
type ImmutableRef<T=object> = {
    current: Cloneable<T>,                          // The current instance
    enabled: boolean,                                // Whether immutability is enabled
    cloneListeners: Array<(imRef: ImmutableRef<T>) => void>  // Callbacks invoked on clone
};
```

### Functions

#### `immutable<T>(obj: Cloneable<T>): ImmutableRef<T>`

Creates an immutable reference wrapper around the provided object.

**Parameters:**
- `obj`: An object that implements the `clone()` method

**Returns:**
- An `ImmutableRef<T>` object containing:
  - `current`: The proxied instance (initially the object you passed in)
  - `enabled`: A boolean flag (initially `true`) that controls whether immutability is active
  - `cloneListeners`: An empty array (initially `[]`) where you can register listener callbacks

**Example:**
```typescript
const ref = immutable<MyClass>(new MyClass());
ref.current.mutate(); // Creates a new instance
console.log(ref.enabled); // true
```

#### `immutableMut<T>(value: Cloneable<T>, cb: (v: Cloneable<T>) => void): Cloneable<T>`
A utility function that allows you to perform mutations on a clone of the provided value within a callback, without fully wrapping it in an `ImmutableRef` and making every future mutation trigger cloning.

**Parameters:**
- `value`: An object that implements the `clone()` method
- `cb`: A callback function that receives the cloned object for mutation

**Returns:**
- The mutated clone of the original object

## How Mutations Are Handled

1. **Property Setters**: When you set a property (e.g., `obj.prop = value`), the library:
   - Clones the object
   - Temporarily disables immutability during the setter execution
   - Sets the property on the clone
   - Re-enables immutability
   - Updates `current` to point to the new clone
   - Invokes all registered clone listeners

2. **Method Calls**: When you call a method (except `clone()`), the library:
   - Clones the object
   - Temporarily disables immutability during method execution
   - Calls the method on the clone
   - Re-enables immutability
   - Updates `current` to point to the new clone
   - Invokes all registered clone listeners
   - Returns the method's result

3. **Read Operations**: Property reads and getters do not trigger cloning and return the value directly.

4. **The `clone()` Method**: Calling `clone()` explicitly does not trigger the immutability mechanism and returns a clone directly.

## Peer Dependencies

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