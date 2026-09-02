/********************************************************************************
 * Copyright (c) 2023-2026 Business Informatics Group (TU Wien) and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import type { Locator } from '@playwright/test';
import type { GLSPLocator } from '../remote/locator';

function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null;
}

/**
 * Asserts that the provided value is not undefined or null.
 * It throws on failure.
 *
 * @param value Value to check
 * @param msg Message to throw if assertion fails
 */
export function assertIsDefined<T>(value: T, msg?: string): asserts value is NonNullable<T> {
    if (!isDefined(value)) {
        throw Error(msg ?? `${value} is not defined.`);
    }
}

/**
 * Asserts that the provided value is not undefined or null
 * and returns the value. It throws on failure.
 *
 * @param value Value to check
 * @returns Non nullable value
 */
export function defined<T>(value: T | undefined | null): T {
    assertIsDefined(value);
    return value;
}

export async function definedGLSPAttr(locator: GLSPLocator, attr: string): Promise<string> {
    const o = await locator.locate().getAttribute(attr);
    if (!isDefined(o)) {
        // Provide additional information
        console.error('=========== Element ==========');
        console.error(await locator.locate().evaluate(elem => elem.outerHTML));
        throw Error(`Attribute ${attr} is not defined for the selector.`);
    }

    return o;
}

export async function definedAttr(locator: Locator, attr: string): Promise<string> {
    const o = await locator.getAttribute(attr);
    if (!isDefined(o)) {
        // Provide additional information
        console.error('=========== Element ==========');
        console.error(await locator.evaluate(elem => elem.outerHTML));
        throw Error(`Attribute ${attr} is not defined for the selector`);
    }

    return o;
}

export function hasProperty<T extends object, K extends keyof T = keyof T>(obj: object, prop: K): obj is Record<K, unknown> {
    return prop in obj;
}

export function isUndefinedOrValue<T>(element: T | undefined, value: T): boolean {
    return element === undefined || element === value;
}
