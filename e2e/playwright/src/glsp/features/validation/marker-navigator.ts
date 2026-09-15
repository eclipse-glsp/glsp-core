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

import { waitForClassRemoval } from '../../../utils/test.utils';
import { Selectable } from '../../../extension';
import { GLSPSemanticApp } from '../../app';
import { GLSPSemanticGraph, PModelElement } from '../../graph';

export abstract class MarkerNavigator {
    protected abstract forwardKey: string;
    protected abstract backwardKey: string;

    protected get graph(): GLSPSemanticGraph {
        return this.app.graph;
    }

    constructor(protected readonly app: GLSPSemanticApp) {}

    async trigger(): Promise<void> {
        await this.app.toolPalette.toolbar.validateTool().trigger();
    }

    async navigateForward(): Promise<void> {
        await this.navigate(this.forwardKey);
    }

    async navigateBackward(): Promise<void> {
        await this.navigate(this.backwardKey);
    }

    protected async navigate(key: string): Promise<void> {
        await this.graph.focus();
        const selectedElements = await this.graph.getSelectedElements(PModelElement);
        await this.app.page.keyboard.press(key);
        if (selectedElements.length === 0) {
            await this.app.page.waitForSelector(`.${Selectable.CSS}`);
        } else {
            await waitForClassRemoval(selectedElements[0].locate(), Selectable.CSS);
            await this.app.page.waitForSelector(`.${Selectable.CSS}`);
        }
    }
}
