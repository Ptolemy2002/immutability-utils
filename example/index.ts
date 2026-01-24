import { immutable, ImmutableRef } from "@ptolemy2002/immutability-utils";

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

function executeTest(
    name: string, testFn: (d: ImmutableRef<Data>) => void,
    initialValue: number = 10, expectedNewValues: number[] = [10],
    expectedMutated: boolean = true,
    passes: number = 3, expectedCloneCalls: number = 1,
    logPasses: boolean = true
) {
    console.log(`\n--- ${name} ---`);

    let cloneCalls = 0;
    let cloneListenerCalls = 0;
    cloneCallCallback = () => { cloneCalls++; };
    const dataRef = immutable<Data>(new Data(initialValue));
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
        if (logPasses) console.log(valueTestPassed ? "VALUE TEST PASSED" : "VALUE TEST FAILED");

        const mutationTestPassed = (prevData !== dataRef.current) === expectedMutated;
        if (logPasses) console.log(mutationTestPassed ? "MUTATION TEST PASSED" : "MUTATION TEST FAILED");

        // This test is for ensuring the reference to 'this' is correct inside methods
        const thisRefTestPassed = (dataRef.current.number === dataRef.current.numberGetter);
        if (logPasses) console.log(thisRefTestPassed ? "THIS REF TEST PASSED" : "THIS REF TEST FAILED");

        const cloneCallTestPassed = (cloneCalls === expectedCloneCalls);
        if (logPasses) console.log(cloneCallTestPassed ? "CLONE CALL TEST PASSED" : "CLONE CALL TEST FAILED");

        const cloneListenerCallTestPassed = (cloneListenerCalls === cloneCalls);
        if (logPasses) console.log(cloneListenerCallTestPassed ? "CLONE LISTENER CALL TEST PASSED" : "CLONE LISTENER CALL TEST FAILED");

        if (valueTestPassed && mutationTestPassed && thisRefTestPassed && cloneCallTestPassed && cloneListenerCallTestPassed) {
            passesSucceeded++;
        }
    }

    console.log(`Passes succeeded: ${passesSucceeded} / ${passes}`);
}

executeTest("Direct Mutation Test | Variable", (d) => {
    d.current.number = 20;
}, 0, [20, 20, 20], true, 3, 1, false);

executeTest("Direct Mutation Test | Setter", (d) => {
    d.current.numberSetter = 30;
}, 0, [30, 30, 30], true, 3, 1, false);

executeTest("Increment Call Test", (d) => {
    d.current.increment(5);
}, 0, [5, 10, 15], true, 3, 1, false);

executeTest("Double Increment Call Test", (d) => {
    d.current.doubleIncrement(4);
}, 0, [8, 16, 24], true, 3, 1, false);

executeTest("Decrement Call Test", (d) => {
    d.current.decrement(3);
}, 0, [-3, -6, -9], true, 3, 1, false);

executeTest("Double Decrement Call Test", (d) => {
    d.current.doubleDecrement(2);
}, 0, [-4, -8, -12], true, 3, 1, false);

executeTest("Chained Calls Test", (d) => {
    d.current.increment(10).decrement(4);
}, 0, [6, 12, 18], true, 3, 1, false);

executeTest("Setting Same Value Test", (d) => {
    d.current.number = d.current.number;
}, 0, [0, 0, 0], true, 3, 1, false);
executeTest("No Mutation Test | Variable", (d) => {
    d.current.number;
}, 0, [0, 0, 0], false, 3, 0, false);

executeTest("No Mutation Test | Getter", (d) => {
    d.current.numberGetter;
}, 0, [0, 0, 0], false, 3, 0, false);

// Expect 1 clone call instead of 0, since the clone method will always be called when testFn is executed
executeTest("No Mutation Test | Clone Call", (d) => {
    d.current.clone();
}, 0, [0, 0, 0], false, 3, 1, false);

executeTest("Method Returning Number Test", (d) => {
    const result = d.current.doubleValue();
}, 5, [5, 5, 5], true, 3, 1, false);

executeTest("Method Returning Void Test", (d) => {
    d.current.reset();
}, 10, [0, 0, 0], true, 3, 1, false);

executeTest("Sequential Mutations Test", (d) => {
    d.current.number = 5;
    d.current.number = 10;
    d.current.number = 15;
}, 0, [15, 15, 15], true, 3, 3, false);

executeTest("Getter Then Setter Test", (d) => {
    const val = d.current.numberGetter;
    d.current.numberSetter = val + 10;
}, 0, [10, 20, 30], true, 3, 1, false);

executeTest("Chained With Non-Data Return Test", (d) => {
    d.current.increment(5);
    d.current.doubleValue();
    d.current.increment(3);
}, 0, [8, 16, 24], true, 3, 3, false);

executeTest("Property As Method Arg Test", (d) => {
    d.current.increment(d.current.number);
}, 5, [10, 20, 40], true, 3, 1, false);

executeTest("Triple Chained Calls Test", (d) => {
    d.current.increment(2).increment(3).decrement(1);
}, 0, [4, 8, 12], true, 3, 1, false);

executeTest("Different Initial Value Test", (d) => {
    d.current.increment(5);
}, 100, [105, 110, 115], true, 3, 1, false);

executeTest("Conditional Setter No Change Test", (d) => {
    d.current.clampedSetter = -5;
}, 0, [0, 0, 0], true, 3, 1, false);

executeTest("Method Calling Setter Test", (d) => {
    d.current.setViaProperty(42);
}, 0, [42, 42, 42], true, 3, 1, false);