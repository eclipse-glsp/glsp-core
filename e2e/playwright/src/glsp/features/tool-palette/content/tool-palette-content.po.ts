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
import { definedAttr } from '../../../../utils/ts.utils';
import type { GLSPToolPalette } from '../tool-palette.po';
import { ToolPaletteContentGroup, ToolPaletteContentGroupConstructor } from './tool-palette-content-group.po';
import { ToolPaletteContentItem, ToolPaletteContentItemConstructor } from './tool-palette-content-item.po';

export class GLSPToolPaletteContent {
    readonly paletteLocator;

    constructor(public readonly toolPalette: GLSPToolPalette) {
        this.paletteLocator = toolPalette.locator;
    }

    async groupsOfType<TToolGroup extends ToolPaletteContentGroup>(
        constructor: ToolPaletteContentGroupConstructor<TToolGroup>
    ): Promise<TToolGroup[]> {
        const toolGroupLocator = this.paletteLocator.child('.tool-group');
        const groups: TToolGroup[] = [];

        for await (const locator of await toolGroupLocator.locate().all()) {
            const id = await definedAttr(locator, 'id');
            const group = this.groupById(id, constructor);

            groups.push(group);
        }

        return groups;
    }

    groupById<TToolGroup extends ToolPaletteContentGroup>(
        id: string,
        constructor: ToolPaletteContentGroupConstructor<TToolGroup>
    ): TToolGroup {
        const toolGroupLocator = this.paletteLocator.child(`[id=${id}].tool-group`);

        return new constructor(toolGroupLocator, this.toolPalette);
    }

    async groupByHeaderText<TToolGroup extends ToolPaletteContentGroup>(
        headerText: string,
        constructor: ToolPaletteContentGroupConstructor<TToolGroup>
    ): Promise<TToolGroup> {
        const toolGroupLocator = this.paletteLocator.locate().locator('.tool-group', {
            has: this.paletteLocator.page.locator('.group-header', { hasText: headerText })
        });

        const id = await definedAttr(toolGroupLocator, 'id');

        return this.groupById(id, constructor);
    }

    async itemBy<TToolGroup extends ToolPaletteContentGroup, TToolElement extends ToolPaletteContentItem<TToolGroup>>(options: {
        groupHeaderText: string;
        groupConstructor: ToolPaletteContentGroupConstructor<TToolGroup>;
        elementText: string;
        elementConstructor: ToolPaletteContentItemConstructor<TToolGroup, TToolElement>;
    }): Promise<TToolElement> {
        const toolGroup = await this.groupByHeaderText(options.groupHeaderText, options.groupConstructor);

        return new options.elementConstructor(
            this.paletteLocator.override(toolGroup.locator.locate().locator(`:text-is("${options.elementText}")`)),
            toolGroup
        );
    }
}
