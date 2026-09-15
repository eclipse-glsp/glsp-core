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
    ChildrenAccessor,
    Mix,
    NodeMetadata,
    PLabelledElement,
    PNode,
    SVGMetadataUtils,
    useClickableFlow,
    useCommandPaletteCapability,
    useDeletableFlow,
    useDraggableFlow,
    useHoverableFlow,
    usePopupCapability,
    useRenameableFlow,
    useResizeHandleCapability,
    useSelectableFlow
} from '@eclipse-glsp/playwright';
import { LabelHeading } from './label-heading.po';

export const TaskManualMixin = Mix(PNode)
    .flow(useClickableFlow)
    .flow(useHoverableFlow)
    .flow(useDeletableFlow)
    .flow(useDraggableFlow)
    .flow(useRenameableFlow)
    .flow(useSelectableFlow)
    .capability(useResizeHandleCapability)
    .capability(usePopupCapability)
    .capability(useCommandPaletteCapability)
    .build();

@NodeMetadata({
    type: 'task:manual'
})
export class TaskManual extends TaskManualMixin implements PLabelledElement {
    override readonly children = new TaskManualChildren(this);

    get label(): Promise<string> {
        return this.children.label().then(label => label.textContent());
    }
}

export class TaskManualChildren extends ChildrenAccessor {
    async label(): Promise<LabelHeading> {
        return this.ofType(LabelHeading, { selector: SVGMetadataUtils.typeAttrOf(LabelHeading) });
    }
}
