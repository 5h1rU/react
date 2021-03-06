/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Deadline} from 'react-reconciler/src/ReactFiberScheduler';

// Current virtual time
export let nowImplementation = () => 0;
export let scheduledCallback: ((deadline: Deadline) => mixed) | null = null;
export let yieldedValues: Array<mixed> = [];

export function scheduleDeferredCallback(
  callback: (deadline: Deadline) => mixed,
  options?: {timeout: number},
): number {
  scheduledCallback = callback;
  const fakeCallbackId = 0;
  return fakeCallbackId;
}

export function cancelDeferredCallback(timeoutID: number): void {
  scheduledCallback = null;
}

export function setNowImplementation(implementation: () => number): void {
  nowImplementation = implementation;
}

function verifyExpectedValues(expectedValues: Array<mixed>): void {
  for (let i = 0; i < expectedValues.length; i++) {
    const expectedValue = `"${(expectedValues[i]: any)}"`;
    const yieldedValue =
      i < yieldedValues.length ? `"${(yieldedValues[i]: any)}"` : 'nothing';
    if (yieldedValue !== expectedValue) {
      const error = new Error(
        `Flush expected to yield ${(expectedValue: any)}, but ${(yieldedValue: any)} was yielded`,
      );
      // Attach expected and yielded arrays,
      // So the caller could pretty print the diff (if desired).
      (error: any).expectedValues = expectedValues;
      (error: any).actualValues = yieldedValues;
      throw error;
    }
  }

  if (expectedValues.length !== yieldedValues.length) {
    const error = new Error(
      `Flush expected to yield ${expectedValues.length} values, but yielded ${
        yieldedValues.length
      }`,
    );
    // Attach expected and yielded arrays,
    // So the caller could pretty print the diff (if desired).
    (error: any).expectedValues = expectedValues;
    (error: any).actualValues = yieldedValues;
    throw error;
  }
}

export function flushAll(expectedValues: Array<mixed>): Array<mixed> {
  yieldedValues = [];
  while (scheduledCallback !== null) {
    const cb = scheduledCallback;
    scheduledCallback = null;
    cb({
      timeRemaining() {
        // Keep rendering until there's no more work
        return 999;
      },
      // React's scheduler has its own way of keeping track of expired
      // work and doesn't read this, so don't bother setting it to the
      // correct value.
      didTimeout: false,
    });
  }
  verifyExpectedValues(expectedValues);
  return yieldedValues;
}

export function flushThrough(expectedValues: Array<mixed>): Array<mixed> {
  let didStop = false;
  yieldedValues = [];
  while (scheduledCallback !== null && !didStop) {
    const cb = scheduledCallback;
    scheduledCallback = null;
    cb({
      timeRemaining() {
        if (yieldedValues.length >= expectedValues.length) {
          // We at least as many values as expected. Stop rendering.
          didStop = true;
          return 0;
        }
        // Keep rendering.
        return 999;
      },
      // React's scheduler has its own way of keeping track of expired
      // work and doesn't read this, so don't bother setting it to the
      // correct value.
      didTimeout: false,
    });
  }
  verifyExpectedValues(expectedValues);
  return yieldedValues;
}

export function yieldValue(value: mixed): void {
  yieldedValues.push(value);
}

export function withCleanYields(fn: Function) {
  yieldedValues = [];
  fn();
  return yieldedValues;
}
