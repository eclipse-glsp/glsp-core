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
import type { Hoverable } from '../../../extension/flows';
import type { GLSPApp } from '../..';
import type { GLSPLocator } from '../../../remote';
import { Locateable } from '../../../remote';
import { definedGLSPAttr } from '../../../utils/ts.utils';

export interface GLSPPopupOptions {
    locator: GLSPLocator;
}

/**
 * The container for all popups
 */
export class GLSPPopup extends Locateable {
    static locate(app: GLSPApp): GLSPLocator {
        return app.rootLocator.child('[id="sprotty-popup"]');
    }

    constructor(protected readonly options: GLSPPopupOptions) {
        super(options.locator);
    }

    async classAttr(): Promise<string> {
        return definedGLSPAttr(this.locator, 'class');
    }

    async close(): Promise<void> {
        await this.app.graph.focus();
        await this.waitForHidden();
    }
}

/**
 * The popup itself
 */
export class Popup extends Locateable {
    constructor(public readonly element: Locateable & Hoverable) {
        super(element.app.popup.locator.child('[id$="_sprotty-popup"]'));
    }

    async innerText(): Promise<string> {
        return this.locate().innerText();
    }
}
