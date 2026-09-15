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
import { GLSPSemanticGraph, isPNodeConstructor, PModelElement, PModelElementConstructor, waitForFunction } from '@eclipse-glsp/playwright';

export class WorkflowGraph extends GLSPSemanticGraph {
    override async waitForCreationOfType<TElement extends PModelElement>(
        constructor: PModelElementConstructor<TElement>,
        creator: () => Promise<void>
    ): Promise<TElement[]> {
        const elements = await super.waitForCreationOfType(constructor, creator);

        if (isPNodeConstructor(constructor)) {
            await waitForFunction(async () =>
                elements.every(element => element.locate().evaluate(node => node?.classList.contains('selected')))
            );
        }

        return elements;
    }
}
