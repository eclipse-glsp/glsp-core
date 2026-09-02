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
import {
    GLSPToolPalette,
    GLSPToolPaletteContent,
    GLSPToolPaletteOptions,
    ToolPaletteContentGroup,
    ToolPaletteContentItem
} from '@eclipse-glsp/playwright';

export class WorkflowToolPalette extends GLSPToolPalette {
    override readonly content: WorkflowToolPaletteContent;

    constructor(options: GLSPToolPaletteOptions) {
        super(options);
        this.content = new WorkflowToolPaletteContent(this);
    }
}

export interface WorkflowToolGroups {
    Nodes: 'Automated Task' | 'Category' | 'Decision Node' | 'Fork Node' | 'Join Node' | 'Manual Task' | 'Merge Node';
    Edges: 'Edge' | 'Weighted edge';
}

export class WorkflowToolPaletteContent extends GLSPToolPaletteContent {
    async toolGroups(): Promise<ToolPaletteContentGroup[]> {
        return super.groupsOfType(ToolPaletteContentGroup);
    }

    async toolGroupByHeaderText<TToolGroupKey extends keyof WorkflowToolGroups>(
        headerText: TToolGroupKey
    ): Promise<ToolPaletteContentGroup> {
        return super.groupByHeaderText(headerText, ToolPaletteContentGroup);
    }

    async toolElement<TToolGroupKey extends keyof WorkflowToolGroups>(
        groupHeader: TToolGroupKey,
        elementText: WorkflowToolGroups[TToolGroupKey]
    ): Promise<ToolPaletteContentItem<ToolPaletteContentGroup>> {
        return super.itemBy({
            groupHeaderText: groupHeader,
            groupConstructor: ToolPaletteContentGroup,
            elementText,
            elementConstructor: ToolPaletteContentItem
        });
    }
}
