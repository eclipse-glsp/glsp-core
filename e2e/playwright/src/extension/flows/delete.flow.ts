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
import type { Locateable } from '../../remote';
import type { ConstructorA } from '../../types';
import type { Flow } from '../types';
import type { Clickable } from './click.flow';

/**
 * Flow for deleting an element.
 */
export interface Deletable {
    /**
     * Delete the element.
     */
    delete(): Promise<void>;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link Deletable} flow.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link Deletable} flow
 */
export function useDeletableFlow<TBase extends ConstructorA<Locateable & Clickable>>(Base: TBase): Flow<TBase, Deletable> {
    abstract class Mixin extends Base implements Deletable {
        /**
         * Delete the element.
         *
         * **Details**
         *
         * The deletion is triggered by pressing the `Delete` key.
         */
        async delete(): Promise<void> {
            await this.click();
            await this.page.keyboard.press('Delete');
            await this.waitFor({ state: 'detached' });
        }
    }

    return Mixin;
}
