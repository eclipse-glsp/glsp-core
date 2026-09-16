/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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
import { PModelElement } from '../../glsp';
import type { ConstructorA } from '../../types';
import type { Flow } from '../types';
import { Clickable } from './click.flow';

export interface SelectableOptions {
    modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>;
}

export interface Selectable {
    select(options?: SelectableOptions): Promise<void>;
}

export namespace Selectable {
    export const CSS = 'selected';
}

export function useSelectableFlow<TBase extends ConstructorA<PModelElement & Clickable>>(Base: TBase): Flow<TBase, Selectable> {
    abstract class Mixin extends Base implements Selectable {
        async select(options?: SelectableOptions): Promise<void> {
            await this.click(options);
            return this.locate()
                .and(this.page.locator(`.${Selectable.CSS}`))
                .waitFor();
        }
    }

    return Mixin;
}
