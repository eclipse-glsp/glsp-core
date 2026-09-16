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
import type { Locator, Page } from '@playwright/test';
import type { GLSPApp } from '../glsp/app';

export type LocateContext = 'self' | 'root';

/**
 * Locators represent a way to find element(s) on the page at any moment.
 * They also have access to the {@link GLSPApp}.
 *
 */
export class GLSPLocator {
    constructor(
        protected readonly locator: Locator,
        public readonly app: GLSPApp,
        public readonly parent?: GLSPLocator
    ) {}

    get page(): Page {
        return this.app.page;
    }

    /**
     * Returns the Playwright {@link Locator}
     */
    locate(context: LocateContext = 'self'): Locator {
        if (context === 'root') {
            return this.root().locator;
        }

        return this.locator;
    }

    /**
     * Returns the root {@link GLSPLocator} of the current locator.
     */
    root(): GLSPLocator {
        return this.parent?.root() ?? this;
    }

    /**
     * Appends the provided selector to the current {@link GLSPLocator} as child.
     *
     * @param selectorOrLocator Selector or locator of the element
     * @param options Options for the locator
     * @returns New {@link GLSPLocator} with the provided selector as child
     */
    child(selectorOrLocator: string | Locator, options?: Parameters<Locator['locator']>[1]): GLSPLocator {
        return new GLSPLocator(this.locator.locator(selectorOrLocator, options), this.app, this);
    }

    /**
     * Appends the provided selector to the the current {@link GLSPLocator} as sibling.
     *
     * @param locator Locator of the element
     * @returns New {@link GLSPLocator} with the provided locator as sibling
     */
    override(locator: Locator): GLSPLocator {
        return new GLSPLocator(locator, this.app, this.parent);
    }
}

export namespace GLSPLocator {
    export function asLocator(selectorOrLocator: string | Locator | GLSPLocator, transform?: (selector: string) => Locator): Locator {
        if (typeof selectorOrLocator === 'string') {
            if (!transform) {
                throw new Error('Transform is required when passing a selector string');
            }

            return transform(selectorOrLocator);
        } else if (selectorOrLocator instanceof GLSPLocator) {
            return selectorOrLocator.locate();
        }

        return selectorOrLocator;
    }

    // Chains multiple locators with a logical OR
    export function or(...locators: (Locator | GLSPLocator)[]): Locator {
        const loc = locators.map(locator => GLSPLocator.asLocator(locator));
        return loc.reduce((acc, locator) => acc.or(locator), loc[0]);
    }
}
