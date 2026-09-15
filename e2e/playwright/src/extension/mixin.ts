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
import type { Capability, Flow } from './types';

export interface Mixable<P> {
    capability<R extends Capability<P, any>>(fn: (arg: P) => R): Mixable<R>;
    flow<R extends Flow<P, any>>(fn: (arg: P) => R): Mixable<R>;
    build(): P;
}

/**
 * This function extends a base class with new functionality by using
 * [Extension-Providers](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md).
 *
 * **Usage**
 *
 * ```ts
 * const Mixin = Mix(PNode)
 *  .flow(useClickableFlow)
 *  .flow(useHoverableFlow)
 *  .flow(useDeletableFlow)
 *  .capability(useResizeHandleCapability)
 *  .capability(usePopupCapability)
 *  .capability(useCommandPaletteCapability)
 *  .build();
 *
 * class Foo extends Mixin { ... }
 * ```
 *
 * **Note**: The returned class can be further extended / overriden.
 *
 * @param base Base class to extend
 * @returns Extended class with new functionality
 */
export function Mix<T>(base: T): Mixable<T> {
    return {
        capability<R>(fn: (payload: T) => R) {
            return Mix<R>(fn(base));
        },
        flow<R>(fn: (payload: T) => R) {
            return Mix<R>(fn(base));
        },
        build(): T {
            return base;
        }
    };
}
