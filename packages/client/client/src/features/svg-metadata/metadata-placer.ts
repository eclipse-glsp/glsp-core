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

import { DOMHelper, GChildElement, GModelElement, GModelRoot, IVNodePostprocessor, TYPES, setAttr } from '@eclipse-glsp/sprotty';
import { inject, injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { GEdge } from '../../model';
import { SVGMetadata } from './svg-metadata';

@injectable()
export class MetadataPlacer implements IVNodePostprocessor {
    @inject(TYPES.DOMHelper) protected domHelper: DOMHelper;

    decorate(vnode: VNode, element: GModelElement): VNode {
        if (element instanceof GModelRoot) {
            setAttr(vnode, SVGMetadata.api, true);
        }

        setAttr(vnode, SVGMetadata.type, element.type);

        if (element instanceof GChildElement) {
            setAttr(vnode, SVGMetadata.parentId, this.domHelper.createUniqueDOMElementId(element.parent));
        }
        if (element instanceof GEdge) {
            if (element.source !== undefined) {
                setAttr(vnode, SVGMetadata.Edge.sourceId, this.domHelper.createUniqueDOMElementId(element.source));
            }
            if (element.target !== undefined) {
                setAttr(vnode, SVGMetadata.Edge.targetId, this.domHelper.createUniqueDOMElementId(element.target));
            }
        }
        return vnode;
    }

    postUpdate(): void {
        // empty
    }
}
