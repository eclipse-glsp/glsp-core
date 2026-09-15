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
import { assertIsDefined } from '../../utils/ts.utils';
import { Locateable } from '../locateable';
import type { GLSPLocator } from '../locator';

/**
 * Helper page object for an input field
 */
export class Input extends Locateable {
    protected readonly keyboard;

    constructor(locator: GLSPLocator) {
        super(locator);
        this.keyboard = this.locator.page.keyboard;
    }

    async focus(): Promise<void> {
        await this.locate().click();
        await this.waitForEditable();
    }

    async text(): Promise<string> {
        return this.locate().inputValue();
    }

    async type(text: string, options?: { delay: number }): Promise<void> {
        await this.focus();
        await this.keyboard.type(text, options);
    }

    async press(key: string, options?: { delay: number }): Promise<void> {
        await this.focus();
        await this.keyboard.press(key, options);
    }

    async clear(options?: { delay: number }): Promise<void> {
        await this.focus();
        await this.keyboard.press('Control+a', options);
        await this.keyboard.press('Backspace', options);
    }

    async waitForEditable(): Promise<void> {
        const handle = await this.locate().elementHandle();
        assertIsDefined(handle);
        await handle.waitForElementState('editable');
    }
}
