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

import { GLSPApp } from '../../app';
import { GLSPGraph } from '../../graph';

export abstract class UndoRedoTrigger {
    protected abstract undoKey: string;
    protected abstract redoKey: string;

    protected get graph(): GLSPGraph {
        return this.app.graph;
    }

    constructor(protected readonly app: GLSPApp) {}

    async undo(): Promise<void> {
        await this.do(this.undoKey);
    }

    async redo(): Promise<void> {
        await this.do(this.redoKey);
    }

    protected async do(key: string): Promise<void> {
        await this.app.graph.locate().press(key);
    }
}
