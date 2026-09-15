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
 * Flow for renaming an element.
 */
export interface Renameable {
    /**
     * Rename the element.
     *
     * @param newName New name for the element
     */
    rename(newName: string): Promise<void>;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link Renameable} flow.
 *
 * **Details**
 *
 * The renaming is done by utilizing the edit label functionality.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link useRenameableFlow} flow
 */
export function useRenameableFlow<TBase extends ConstructorA<Locateable & Clickable>>(Base: TBase): Flow<TBase, Renameable> {
    abstract class Mixin extends Base implements Renameable {
        /**
         * Rename the element.
         *
         * **Details**
         *
         * The renaming is done by
         * 1. double clicking the element
         * 1. typing the name
         * 1. submitting by pressing enter
         *
         * @param newName New name for the element
         */
        async rename(newName: string): Promise<void> {
            const keyboard = this.page.keyboard;
            const labelEditor = this.app.labelEditor;

            await this.dblclick();
            await labelEditor.waitForVisible();
            await keyboard.type(newName);
            await keyboard.press('Enter');
            await labelEditor.waitForHidden();
        }
    }

    return Mixin;
}
