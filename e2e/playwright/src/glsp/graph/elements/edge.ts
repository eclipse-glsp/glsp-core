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
import { definedGLSPAttr } from '../../../utils/ts.utils';
import { ConstructorT } from '../../../types';
import { EdgeMetadata } from '../decorators';
import { SVGMetadata, SVGMetadataUtils } from '../svg-metadata-api';
import type { PModelElementConstructor } from './element';
import { assertEqualType, PModelElement } from './element';
import { PNode, PNodeConstructor } from './node';

export type PEdgeConstructor<TElement extends PEdge = PEdge> = PModelElementConstructor<TElement>;

export function isPEdgeConstructor(constructor: ConstructorT): constructor is PEdgeConstructor {
    return constructor.prototype instanceof PEdge;
}

@EdgeMetadata({
    type: 'edge'
})
export class PEdge extends PModelElement {
    async sourceId(): Promise<string> {
        return definedGLSPAttr(this.locator, SVGMetadata.Edge.sourceId);
    }

    async targetId(): Promise<string> {
        return definedGLSPAttr(this.locator, SVGMetadata.Edge.targetId);
    }

    async sourceOfType<TSource extends PNode>(constructor: PNodeConstructor<TSource>): Promise<TSource> {
        const sourceId = await this.sourceId();

        const locator = this.graph.locator.child(`[id$="${sourceId}"]${SVGMetadataUtils.typeAttrOf(constructor)}`);
        const element = new constructor({ locator });
        await assertEqualType(element);

        return element;
    }

    async targetOfType<TTarget extends PNode>(constructor: PNodeConstructor<TTarget>): Promise<TTarget> {
        const targetId = await this.targetId();

        const locator = this.graph.locator.child(`[id$="${targetId}"]${SVGMetadataUtils.typeAttrOf(constructor)}`);
        const element = new constructor({ locator });
        await assertEqualType(element);

        return element;
    }
}
