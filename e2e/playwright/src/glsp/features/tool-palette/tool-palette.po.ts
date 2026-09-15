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
import type { GLSPApp } from '../..';
import { Locateable } from '../../../remote';
import type { GLSPLocator } from '../../../remote/locator';
import { GLSPToolPaletteContent } from './content/tool-palette-content.po';
import { GLSPToolPaletteToolbar } from './toolbar/tool-palette-toolbar.po';

export interface GLSPToolPaletteOptions {
    locator: GLSPLocator;
    minimizeButtonLocator?: GLSPLocator;
}

export class GLSPToolPalette extends Locateable {
    static locate(app: GLSPApp): GLSPLocator {
        return app.locator.child('[id$="_tool-palette"]');
    }

    readonly buttonLocator;

    readonly toolbar;
    readonly content;

    constructor(protected readonly options: GLSPToolPaletteOptions) {
        super(options.locator);
        this.buttonLocator = options.minimizeButtonLocator ?? this.app.locator.child('.minimize-palette-button');

        this.toolbar = this.createToolbar();
        this.content = this.createContent();
    }

    async hide(): Promise<void> {
        if (await this.isVisible()) {
            await this.buttonLocator.locate().click();
        }
    }

    async show(): Promise<void> {
        if (await this.isHidden()) {
            await this.buttonLocator.locate().click();
        }
    }

    protected createToolbar(): GLSPToolPaletteToolbar {
        return new GLSPToolPaletteToolbar(this);
    }

    protected createContent(): GLSPToolPaletteContent {
        return new GLSPToolPaletteContent(this);
    }
}
