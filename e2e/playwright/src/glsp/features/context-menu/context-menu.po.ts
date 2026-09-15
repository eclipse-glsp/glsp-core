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
import { dedent } from 'ts-dedent';
import type { GLSPLocator } from '../../../remote';
import { Locateable } from '../../../remote/locateable';

export interface GLSPContextMenuOptions {
    locator: GLSPLocator;
}

export class GLSPContextMenu extends Locateable {
    constructor(protected readonly options: GLSPContextMenuOptions) {
        super(options.locator);
    }

    async open(): Promise<void> {
        await this.page.mouse.down({
            button: 'right'
        });

        await this.waitForVisible();
    }

    async close(): Promise<void> {
        await this.page.keyboard.press('Escape');
        await this.waitForHidden();
    }
}

export const GLSPContextMenuNotSupported: GLSPContextMenu = new Proxy(GLSPContextMenu.prototype, {
    get(target, prop: keyof typeof GLSPContextMenu.prototype, receiver) {
        if (typeof target[prop] === 'function') {
            return function () {
                throw new Error(dedent`The integration does not support a ContextMenu.
                Possible issues:
                - The active integration doesn't provide a context menu locator.
                - This test shouldn't run within the active integration - skip it.
                `);
            };
        }

        return Reflect.get(target, prop, receiver);
    }
});
