import { immutable, ImmutableRef, satisfiesDepth, extClone, isGetter, immutableMut } from "@ptolemy2002/immutability-utils";

let cloneCallCallback = () => {};

class Data {
    number: number;

    set numberSetter(value: number) {
        this.number = value;
    }

    get numberGetter(): number {
        return this.number;
    }

    constructor(number: number) {
        this.number = number;
    }

    increment(amount: number): Data {
        this.number += amount;
        return this;
    }

    doubleIncrement(amount: number): Data {
        this.increment(amount);
        this.increment(amount);
        return this;
    }

    decrement(amount: number): Data {
        this.number -= amount;
        return this;
    }

    doubleDecrement(amount: number): Data {
        this.decrement(amount);
        this.decrement(amount);
        return this;
    }

    doubleValue(): number {
        return this.number * 2;
    }

    reset(): void {
        this.number = 0;
    }

    set clampedSetter(value: number) {
        if (value >= 0) {
            this.number = value;
        }
    }

    setViaProperty(value: number): Data {
        this.numberSetter = value;
        return this;
    }

    clone(): Data {
        cloneCallCallback();
        return new Data(this.number);
    }
}

function executeClonableTest(
    name: string, testFn: (d: ImmutableRef<Data>) => void,
    initialValue: number = 10, expectedNewValues: number[] = [10],
    expectedMutated: boolean = true,
    passes: number = 3, expectedCloneCalls: number = 1,
    expectedCloneListenerOffset: number = 0,
    logPasses: boolean = true
) {
    console.log(`\n--- ${name} ---`);

    let cloneCalls = 0;
    let cloneListenerCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(initialValue));
    dataRef.cloneListeners.push(() => { cloneListenerCalls++; });

    // We need multiple passes so that we can ensure each clone has the proxy applied
    // correctly.
    let passesSucceeded = 0;
    for (let i = 0; i < passes; i++) {
        cloneCalls = 0;
        cloneListenerCalls = 0;
        const expectedNewValue = expectedNewValues[i];
        
        if (logPasses) console.log("\n--- Pass", (i + 1), "---");
        const prevData = dataRef.current;

        if (logPasses) console.log(`Previous number: ${prevData.number}`);
        testFn(dataRef);
        if (logPasses) console.log(`Current number: ${dataRef.current.number}`);

        const valueTestPassed = (dataRef.current.number === expectedNewValue);
        if (logPasses) console.log(valueTestPassed ? "VALUE TEST PASSED" : `VALUE TEST FAILED: ${dataRef.current.number} !== ${expectedNewValue}`);

        const mutationTestPassed = (prevData !== dataRef.current) === expectedMutated;
        if (logPasses) console.log(mutationTestPassed ? "MUTATION TEST PASSED" : "MUTATION TEST FAILED");

        const cloneCallTestPassed = (cloneCalls === expectedCloneCalls);
        if (logPasses) console.log(cloneCallTestPassed ? "CLONE CALL TEST PASSED" : `CLONE CALL TEST FAILED: ${cloneCalls} !== ${expectedCloneCalls}`);

        const cloneListenerCallTestPassed = (cloneListenerCalls + expectedCloneListenerOffset === cloneCalls);
        if (logPasses) console.log(cloneListenerCallTestPassed ? "CLONE LISTENER CALL TEST PASSED" : `CLONE LISTENER CALL TEST FAILED: ${cloneListenerCalls + expectedCloneListenerOffset} !== ${cloneCalls}`);

        // This test is for ensuring the reference to 'this' is correct inside methods. It will cause another clone call.
        const thisRefTestPassed = (dataRef.current.number === dataRef.current.numberGetter);
        if (logPasses) console.log(thisRefTestPassed ? "THIS REF TEST PASSED" : "THIS REF TEST FAILED");

        if (valueTestPassed && mutationTestPassed && thisRefTestPassed && cloneCallTestPassed && cloneListenerCallTestPassed) {
            passesSucceeded++;
        }
    }

    console.log(`Passes succeeded: ${passesSucceeded} / ${passes}`);
}

executeClonableTest("Direct Mutation Test | Variable", (d) => {
    d.current.number = 20;
}, 0, [20, 20, 20], true, 3, 1, 0, false);

executeClonableTest("Direct Mutation Test | Setter", (d) => {
    d.current.numberSetter = 30;
}, 0, [30, 30, 30], true, 3, 1, 0, false);

executeClonableTest("Increment Call Test", (d) => {
    d.current.increment(5);
}, 0, [5, 10, 15], true, 3, 1, 0, false);

executeClonableTest("Double Increment Call Test", (d) => {
    d.current.doubleIncrement(4);
}, 0, [8, 16, 24], true, 3, 1, 0, false);

executeClonableTest("Decrement Call Test", (d) => {
    d.current.decrement(3);
}, 0, [-3, -6, -9], true, 3, 1, 0, false);

executeClonableTest("Double Decrement Call Test", (d) => {
    d.current.doubleDecrement(2);
}, 0, [-4, -8, -12], true, 3, 1, 0, false);

executeClonableTest("Chained Calls Test", (d) => {
    d.current.increment(10).decrement(4);
}, 0, [6, 12, 18], true, 3, 1, 0, false);

executeClonableTest("Setting Same Value Test", (d) => {
    d.current.number = d.current.number;
}, 0, [0, 0, 0], true, 3, 1, 0, false);
executeClonableTest("No Mutation Test | Variable", (d) => {
    d.current.number;
}, 0, [0, 0, 0], false, 3, 0, 0, false);

// Still expect a clone and mutation since the library assumes all getters could potentially cause mutations.
executeClonableTest("No Mutation Test | Getter", (d) => {
    d.current.numberGetter;
}, 0, [0, 0, 0], true, 3, 1, 0, false);

// Expect 1 clone calls instead of 0, since the clone method will always be called when testFn is executed
// However, that will not trigger the clone listener, as the ref will be disabled at that time.
executeClonableTest("No Mutation Test | Clone Call", (d) => {
    d.current.clone();
}, 0, [0, 0, 0], false, 3, 1, 1, false);

executeClonableTest("Method Returning Number Test", (d) => {
    const result = d.current.doubleValue();
}, 5, [5, 5, 5], true, 3, 1, 0, false);

executeClonableTest("Method Returning Void Test", (d) => {
    d.current.reset();
}, 10, [0, 0, 0], true, 3, 1, 0, false);

executeClonableTest("Sequential Mutations Test", (d) => {
    d.current.number = 5;
    d.current.number = 10;
    d.current.number = 15;
}, 0, [15, 15, 15], true, 3, 3, 0, false);

executeClonableTest("Getter Then Setter Test", (d) => {
    const val = d.current.numberGetter;
    d.current.numberSetter = val + 10;
}, 0, [10, 20, 30], true, 3, 2, 0, false);

executeClonableTest("Chained With Non-Data Return Test", (d) => {
    d.current.increment(5);
    d.current.doubleValue();
    d.current.increment(3);
}, 0, [8, 16, 24], true, 3, 3, 0, false);

executeClonableTest("Property As Method Arg Test", (d) => {
    d.current.increment(d.current.number);
}, 5, [10, 20, 40], true, 3, 1, 0, false);

executeClonableTest("Triple Chained Calls Test", (d) => {
    d.current.increment(2).increment(3).decrement(1);
}, 0, [4, 8, 12], true, 3, 1, 0, false);

executeClonableTest("Different Initial Value Test", (d) => {
    d.current.increment(5);
}, 100, [105, 110, 115], true, 3, 1, 0, false);

executeClonableTest("Conditional Setter No Change Test", (d) => {
    d.current.clampedSetter = -5;
}, 0, [0, 0, 0], true, 3, 1, 0, false);

executeClonableTest("Method Calling Setter Test", (d) => {
    d.current.setViaProperty(42);
}, 0, [42, 42, 42], true, 3, 1, 0, false);

// =====================================================
// satisfiesDepth Tests
// =====================================================
function executeSimpleTest(name: string, actual: unknown, expected: unknown) {
    const passed = actual === expected;
    console.log(`${name}: ${passed ? "PASSED" : `FAILED (${actual} !== ${expected})`}`);
}

console.log("\n=== satisfiesDepth Tests ===");
executeSimpleTest("satisfiesDepth | max always true (0)", satisfiesDepth("max", 0), true);
executeSimpleTest("satisfiesDepth | max always true (1000)", satisfiesDepth("max", 1000), true);
executeSimpleTest("satisfiesDepth | depth 0, value 0", satisfiesDepth(0, 0), true);
executeSimpleTest("satisfiesDepth | depth 0, value 1", satisfiesDepth(0, 1), false);
executeSimpleTest("satisfiesDepth | depth 3, value 2", satisfiesDepth(3, 2), true);
executeSimpleTest("satisfiesDepth | depth 3, value 3", satisfiesDepth(3, 3), true);
executeSimpleTest("satisfiesDepth | depth 3, value 4", satisfiesDepth(3, 4), false);
executeSimpleTest("satisfiesDepth | negative depth clamped to 0, value 0", satisfiesDepth(-5, 0), true);
executeSimpleTest("satisfiesDepth | negative depth clamped to 0, value 1", satisfiesDepth(-5, 1), false);

// =====================================================
// isGetter Tests
// =====================================================
console.log("\n=== isGetter Tests ===");

const plainObj = { x: 10 };
executeSimpleTest("isGetter | plain property", isGetter(plainObj, "x"), false);

const getterObj = {
    get y() { return 42; }
};
executeSimpleTest("isGetter | getter property", isGetter(getterObj, "y"), true);
executeSimpleTest("isGetter | nonexistent property", isGetter(plainObj, "nonexistent"), false);

// Test prototype chain - Data class has numberGetter defined via get keyword
const dataInstance = new Data(5);
executeSimpleTest("isGetter | class getter via prototype", isGetter(dataInstance, "numberGetter"), true);
executeSimpleTest("isGetter | class method (not getter)", isGetter(dataInstance, "increment"), false);
executeSimpleTest("isGetter | class plain property", isGetter(dataInstance, "number"), false);
executeSimpleTest("isGetter | class setter is not getter", isGetter(dataInstance, "numberSetter"), false);

// =====================================================
// extClone Tests
// =====================================================
console.log("\n=== extClone Tests ===");

// Test with custom clone method (respectCustom = true)
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const original = new Data(42);
    const cloned = extClone(original, "max", true);
    executeSimpleTest("extClone | custom clone called", cloneCalls, 1);
    executeSimpleTest("extClone | custom clone value correct", cloned.number, 42);
    executeSimpleTest("extClone | custom clone is different ref", original !== cloned, true);
    executeSimpleTest("extClone | custom clone preserves type", cloned instanceof Data, true);
}

// Test with respectCustom = false
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const original = new Data(99);
    const cloned = extClone(original, "max", false);
    executeSimpleTest("extClone | respectCustom=false skips custom clone", cloneCalls, 0);
    executeSimpleTest("extClone | respectCustom=false value correct", cloned.number, 99);
    executeSimpleTest("extClone | respectCustom=false is different ref", original !== cloned, true);
    executeSimpleTest("extClone | respectCustom=false preserves type", cloned instanceof Data, true);
}

// Test depth=0 (shallow clone)
{
    const nested = { inner: { value: 10 } };
    const cloned = extClone(nested, 0, false);
    executeSimpleTest("extClone | depth=0 clones outer", nested !== cloned, true);
    executeSimpleTest("extClone | depth=0 shares inner ref", nested.inner === cloned.inner, true);
}

// Test depth="max" (deep clone)
{
    const nested = { inner: { value: 10 } };
    const cloned = extClone(nested, "max", false);
    executeSimpleTest("extClone | depth=max clones outer", nested !== cloned, true);
    executeSimpleTest("extClone | depth=max clones inner", nested.inner !== cloned.inner, true);
    executeSimpleTest("extClone | depth=max preserves values", cloned.inner.value, 10);
}

// Test depth=1 (one level deep)
{
    const nested = { mid: { deep: { value: 5 } } };
    const cloned = extClone(nested, 1, false);
    executeSimpleTest("extClone | depth=1 clones outer", nested !== cloned, true);
    executeSimpleTest("extClone | depth=1 clones mid", nested.mid !== cloned.mid, true);
    executeSimpleTest("extClone | depth=1 shares deep", nested.mid.deep === cloned.mid.deep, true);
}

// =====================================================
// immutableMut Tests
// =====================================================
console.log("\n=== immutableMut Tests ===");

// Test basic mutation
{
    const original = new Data(10);
    const result = immutableMut(original, (v) => { v.number = 20; });
    executeSimpleTest("immutableMut | original unchanged", original.number, 10);
    executeSimpleTest("immutableMut | result has mutation", result.number, 20);
    executeSimpleTest("immutableMut | different references", original !== result, true);
}

// Test with method calls
{
    const original = new Data(10);
    const result = immutableMut(original, (v) => { v.increment(5); });
    executeSimpleTest("immutableMut | original unchanged after method", original.number, 10);
    executeSimpleTest("immutableMut | result after method", result.number, 15);
}

// Test with respectCustom=true (default, uses Data.clone)
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const original = new Data(10);
    immutableMut(original, (v) => { v.number = 20; }, true);
    executeSimpleTest("immutableMut | respectCustom=true uses custom clone", cloneCalls, 1);
}

// Test with respectCustom=false
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const original = new Data(10);
    const result = immutableMut(original, (v) => { v.number = 20; }, false);
    executeSimpleTest("immutableMut | respectCustom=false skips custom clone", cloneCalls, 0);
    executeSimpleTest("immutableMut | respectCustom=false still works", result.number, 20);
}

// =====================================================
// immutable - nonMutatingKeys Tests
// =====================================================
console.log("\n=== immutable nonMutatingKeys Tests ===");

// When doubleValue is marked as non-mutating, it should not trigger a clone
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10), "max", ["doubleValue"]);
    const prev = dataRef.current;
    const result = dataRef.current.doubleValue();
    executeSimpleTest("nonMutatingKeys | no clone for listed method", cloneCalls, 0);
    executeSimpleTest("nonMutatingKeys | same reference", prev === dataRef.current, true);
    executeSimpleTest("nonMutatingKeys | returns correct value", result, 20);
}

// Non-listed methods should still trigger clones
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10), "max", ["doubleValue"]);
    const prev = dataRef.current;
    dataRef.current.increment(5);
    executeSimpleTest("nonMutatingKeys | clone for unlisted method", cloneCalls, 1);
    executeSimpleTest("nonMutatingKeys | different reference for unlisted", prev !== dataRef.current, true);
}

// numberGetter is a getter - marking it non-mutating should skip cloning
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10), "max", ["numberGetter"]);
    const prev = dataRef.current;
    const val = dataRef.current.numberGetter;
    executeSimpleTest("nonMutatingKeys | no clone for listed getter", cloneCalls, 0);
    executeSimpleTest("nonMutatingKeys | same ref for listed getter", prev === dataRef.current, true);
    executeSimpleTest("nonMutatingKeys | getter returns correct value", val, 10);
}

// Modifying nonMutatingKeys after creation
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10));

    // Initially doubleValue triggers clone
    dataRef.current.doubleValue();
    executeSimpleTest("nonMutatingKeys | initially triggers clone", cloneCalls, 1);

    // Add it to nonMutatingKeys
    cloneCalls = 0;
    dataRef.nonMutatingKeys.push("doubleValue");
    dataRef.current.doubleValue();
    executeSimpleTest("nonMutatingKeys | no clone after adding to list", cloneCalls, 0);
}

// =====================================================
// immutable - enabled Tests
// =====================================================
console.log("\n=== immutable enabled Tests ===");

{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10));

    // Disable immutability
    dataRef.enabled = false;
    const prev = dataRef.current;
    dataRef.current.number = 99;
    executeSimpleTest("enabled=false | no clone on set", cloneCalls, 0);
    executeSimpleTest("enabled=false | same reference (mutated in place)", prev === dataRef.current, true);
    executeSimpleTest("enabled=false | mutation applied", dataRef.current.number, 99);

    // Re-enable
    dataRef.enabled = true;
    cloneCalls = 0;
    const prev2 = dataRef.current;
    dataRef.current.number = 50;
    executeSimpleTest("enabled=true | clone on set after re-enable", cloneCalls, 1);
    executeSimpleTest("enabled=true | different reference", prev2 !== dataRef.current, true);
    executeSimpleTest("enabled=true | mutation applied", dataRef.current.number, 50);
}

// Disable during method calls
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(0));
    dataRef.enabled = false;
    dataRef.current.increment(10);
    executeSimpleTest("enabled=false | no clone on method call", cloneCalls, 0);
    executeSimpleTest("enabled=false | method mutates in place", dataRef.current.number, 10);
}

// =====================================================
// immutable - depth Tests
// =====================================================
console.log("\n=== immutable depth Tests ===");

// With depth=0, custom clone should be called with depth=0
{
    let cloneDepthReceived: unknown = undefined;
    class DepthData {
        value: number;
        constructor(value: number) { this.value = value; }
        clone(depth?: number | "max"): DepthData {
            cloneDepthReceived = depth;
            return new DepthData(this.value);
        }
    }

    const dataRef = immutable(new DepthData(5), 0);
    dataRef.current.value = 10;
    executeSimpleTest("depth=0 | passed to custom clone", cloneDepthReceived, 0);
}

// Changing depth after creation
{
    let cloneDepthReceived: unknown = undefined;
    class DepthData2 {
        value: number;
        constructor(value: number) { this.value = value; }
        clone(depth?: number | "max"): DepthData2 {
            cloneDepthReceived = depth;
            return new DepthData2(this.value);
        }
    }

    const dataRef = immutable(new DepthData2(5), "max");
    dataRef.current.value = 10;
    executeSimpleTest("depth change | initially max", cloneDepthReceived, "max");

    dataRef.depth = 0;
    dataRef.current.value = 20;
    executeSimpleTest("depth change | changed to 0", cloneDepthReceived, 0);
}

// =====================================================
// immutable - respectCustom Tests
// =====================================================
console.log("\n=== immutable respectCustom Tests ===");

{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10), "max", [], false);
    dataRef.current.number = 20;
    executeSimpleTest("respectCustom=false | skips custom clone", cloneCalls, 0);
    executeSimpleTest("respectCustom=false | mutation still works", dataRef.current.number, 20);
}

// Changing respectCustom after creation
{
    let cloneCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable(new Data(10), "max", [], false);

    dataRef.current.number = 20;
    executeSimpleTest("respectCustom change | initially false, no custom clone", cloneCalls, 0);

    cloneCalls = 0;
    dataRef.respectCustom = true;
    dataRef.current.number = 30;
    executeSimpleTest("respectCustom change | changed to true, uses custom clone", cloneCalls, 1);
}

// =====================================================
// immutable - cloneListeners Tests
// =====================================================
console.log("\n=== immutable cloneListeners Tests ===");

// Multiple listeners
{
    let listener1Calls = 0;
    let listener2Calls = 0;
    const dataRef = immutable(new Data(10));
    dataRef.cloneListeners.push(() => { listener1Calls++; });
    dataRef.cloneListeners.push(() => { listener2Calls++; });
    dataRef.current.number = 20;
    executeSimpleTest("cloneListeners | listener 1 called", listener1Calls, 1);
    executeSimpleTest("cloneListeners | listener 2 called", listener2Calls, 1);
}

// Listener receives the ref
{
    let receivedRef: ImmutableRef<Data> | null = null;
    const dataRef = immutable(new Data(10));
    dataRef.cloneListeners.push((ref) => { receivedRef = ref; });
    dataRef.current.number = 20;
    executeSimpleTest("cloneListeners | receives correct ref", receivedRef === dataRef, true);
    executeSimpleTest("cloneListeners | ref has updated value", receivedRef !== null && receivedRef!.current.number === 20, true);
}

// No listeners called when disabled
{
    let listenerCalls = 0;
    const dataRef = immutable(new Data(10));
    dataRef.cloneListeners.push(() => { listenerCalls++; });
    dataRef.enabled = false;
    dataRef.current.number = 20;
    executeSimpleTest("cloneListeners | not called when disabled", listenerCalls, 0);
}