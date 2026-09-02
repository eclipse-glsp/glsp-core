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
import type { Capability } from '../../../extension';
import type { Locateable } from '../../../remote';
import type { ConstructorA } from '../../../types';
import { GLSPElementCommandPalette } from './element-command-palette.po';

/**
 * The command palette is an "auto-complete" widget used to trigger actions.
 *
 * [Learn more about command palettes](https://www.eclipse.org/glsp/documentation/protocol/).
 */
export interface CommandPaletteCapability<TCommandPalette extends GLSPElementCommandPalette = GLSPElementCommandPalette> {
    /**
     * Access the page object of the command palette of the element.
     *
     * @returns Page object of the element command palette
     */
    commandPalette(): TCommandPalette;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link CommandPaletteCapability}.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link CommandPaletteCapability}
 */
export function useCommandPaletteCapability<TBase extends ConstructorA<Locateable>>(
    Base: TBase
): Capability<TBase, CommandPaletteCapability> {
    abstract class Mixin extends Base implements CommandPaletteCapability {
        commandPalette(): GLSPElementCommandPalette {
            return new GLSPElementCommandPalette({ element: this, locator: this.app.globalCommandPalette.locator });
        }
    }

    return Mixin;
}
