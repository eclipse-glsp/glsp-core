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
import { useClickableFlow } from '../../../../extension/flows';
import { Mix } from '../../../../extension/mixin';
import type { GLSPLocator } from '../../../../remote';
import type { ConstructorT } from '../../../../types';
import { definedGLSPAttr } from '../../../../utils/ts.utils';
import { BaseToolPaletteItem } from '../tool-palette-item.base';
import type { GLSPToolPalette } from '../tool-palette.po';
import { ToolPaletteContentItem } from './tool-palette-content-item.po';
import { ClientCSS, classSelector } from '../../../client-dom';

export type ToolPaletteContentGroupConstructor<TToolGroup extends ToolPaletteContentGroup> = ConstructorT<
    TToolGroup,
    [GLSPLocator, GLSPToolPalette]
>;

const ToolPaletteContentGroupMixin = Mix(BaseToolPaletteItem).flow(useClickableFlow).build();
export class ToolPaletteContentGroup extends ToolPaletteContentGroupMixin {
    readonly headerLocator = this.locator.child(classSelector(ClientCSS.GROUP_HEADER));
    readonly itemsLocator = this.locator.child(classSelector(ClientCSS.TOOL_BUTTON));

    async idAttr(): Promise<string> {
        return definedGLSPAttr(this.locator, 'id');
    }

    async classAttr(): Promise<string> {
        return definedGLSPAttr(this.locator, 'class');
    }

    async header(): Promise<string> {
        return this.headerLocator.locate().innerText();
    }

    async items(): Promise<ToolPaletteContentItem<ToolPaletteContentGroup>[]> {
        const elements: ToolPaletteContentItem<ToolPaletteContentGroup>[] = [];

        for await (const locator of await this.itemsLocator.locate().all()) {
            elements.push(new ToolPaletteContentItem(this.itemsLocator.override(locator), this));
        }

        return elements;
    }
}
