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
import { type Locator } from '@playwright/test';
import { useClickableFlow } from '../../../../extension/flows';
import { Mix } from '../../../../extension/mixin';
import type { GLSPLocator } from '../../../../remote/locator';
import type { ConstructorT } from '../../../../types';
import { definedGLSPAttr } from '../../../../utils/ts.utils';
import { expect } from '../../../../test';
import { BaseToolPaletteItem } from '../tool-palette-item.base';
import type { ToolPaletteContentGroup } from './tool-palette-content-group.po';

export type ToolPaletteContentItemConstructor<
    TToolGroup extends ToolPaletteContentGroup,
    TToolElement extends ToolPaletteContentItem<TToolGroup>
> = ConstructorT<TToolElement, [GLSPLocator, TToolGroup]>;

const ToolPaletteContentItemMixin = Mix(BaseToolPaletteItem).flow(useClickableFlow).build();
export class ToolPaletteContentItem<TToolGroup extends ToolPaletteContentGroup> extends ToolPaletteContentItemMixin {
    constructor(
        locator: GLSPLocator,
        public readonly toolGroup: TToolGroup
    ) {
        super(locator, toolGroup.toolPalette);
    }

    async classAttr(): Promise<string> {
        return definedGLSPAttr(this.locator, 'class');
    }

    async tabIndexAttr(): Promise<string> {
        return definedGLSPAttr(this.locator, 'tabindex');
    }

    async text(): Promise<string> {
        return this.locate().innerText();
    }

    override async click(options?: Parameters<Locator['click']>[0] & { dispatch?: boolean }): Promise<void> {
        await super.click(options);
        await expect(this.locate()).toContainClass('clicked');
    }
}
