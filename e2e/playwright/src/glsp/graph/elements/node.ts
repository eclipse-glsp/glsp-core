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
import { expect } from '@playwright/test';
import type { Locator } from 'playwright-core';
import type { ConstructorT } from '../../../types';
import { NodeMetadata } from '../decorators';
import type { EdgeSearchOptions } from '../graph.type';
import { SVGMetadataUtils } from '../svg-metadata-api';
import type { PEdge, PEdgeConstructor } from './edge';
import { PModelElement, PModelElementConstructor } from './element';
import type { BothTypedEdge, SourceTypedEdge } from './typed-edge';

export type PNodeConstructor<TElement extends PNode = PNode> = PModelElementConstructor<TElement>;

export function isPNodeConstructor(constructor: ConstructorT): constructor is PNodeConstructor {
    return constructor.prototype instanceof PNode;
}

@NodeMetadata({
    type: 'node'
})
export class PNode extends PModelElement {
    readonly children = new ChildrenAccessor(this);

    edges(): EdgesAccessor<this> {
        return new EdgesAccessor(this);
    }
}

// Accessors

export class ChildrenAccessor {
    constructor(public readonly parent: PModelElement) {}

    async ofType<TElement extends PModelElement>(
        constructor: PModelElementConstructor<TElement>,
        options?: { deep?: boolean; selector?: string }
    ): Promise<TElement> {
        let locator: Locator;
        if (options?.selector) {
            locator = this.parent.locate().locator(options.selector);
        } else {
            locator = options?.deep
                ? this.parent.locate().locator(SVGMetadataUtils.typeAttrOf(constructor))
                : this.parent.locate().locator(`> ${SVGMetadataUtils.typeAttrOf(constructor)}`);
        }

        return this.parent.graph.getModelElement(locator, constructor);
    }

    async allOfType<TElement extends PModelElement>(
        constructor: PModelElementConstructor<TElement>,
        options: { deep?: boolean } = { deep: true }
    ): Promise<TElement[]> {
        const childrenLocator = options.deep
            ? this.parent.locate().locator(SVGMetadataUtils.typeAttrOf(constructor))
            : this.parent.locate().locator(`> ${SVGMetadataUtils.typeAttrOf(constructor)}`);

        return this.parent.graph.getModelElements(childrenLocator, constructor);
    }
}

export namespace EdgesAccessor {
    export type OutgoingEdgesSearchOptions = Omit<EdgeSearchOptions, 'sourceConstructor' | 'sourceSelector'>;
    export type IncomingEdgesSearchOptions = Omit<EdgeSearchOptions, 'targetConstructor' | 'targetSelector'>;

    export type SourceFixTypedEdge<
        TElement extends PEdge,
        TSource extends PNode,
        TOptions extends OutgoingEdgesSearchOptions
    > = TOptions extends {
        targetConstructor: PNodeConstructor<infer TTarget>;
    }
        ? TElement & BothTypedEdge<TSource, TTarget>
        : TElement & SourceTypedEdge<TSource>;

    export type TargetFixTypedEdge<
        TElement extends PEdge,
        TTarget extends PNode,
        TOptions extends IncomingEdgesSearchOptions
    > = TOptions extends {
        sourceConstructor: PNodeConstructor<infer TSource>;
    }
        ? TElement & BothTypedEdge<TSource, TTarget>
        : TElement & SourceTypedEdge<TTarget>;
}

export class EdgesAccessor<TNode extends PNode> {
    protected readonly sourceConstructor: PNodeConstructor<TNode>;

    constructor(public readonly node: TNode) {
        this.sourceConstructor = Object.getPrototypeOf(node).constructor;
    }

    async outgoingEdgeOfType<TElement extends PEdge, TOptions extends EdgesAccessor.OutgoingEdgesSearchOptions>(
        constructor: PEdgeConstructor<TElement>,
        options?: TOptions
    ): Promise<EdgesAccessor.SourceFixTypedEdge<TElement, TNode, TOptions>> {
        const edges = await this.outgoingEdgesOfType(constructor, options);

        expect(edges).toHaveLength(1);

        return edges[0];
    }

    async outgoingEdgesOfType<TElement extends PEdge, TOptions extends EdgesAccessor.OutgoingEdgesSearchOptions>(
        constructor: PEdgeConstructor<TElement>,
        options?: TOptions
    ): Promise<EdgesAccessor.SourceFixTypedEdge<TElement, TNode, TOptions>[]> {
        const graph = this.node.graph;
        const sourceId = await this.node.idAttr();

        return graph.getEdgesOfType(constructor, {
            ...options,
            sourceId,
            sourceConstructor: this.sourceConstructor
        }) as any;
    }

    async incomingEdgeOfType<TElement extends PEdge, TOptions extends EdgesAccessor.IncomingEdgesSearchOptions>(
        constructor: PEdgeConstructor<TElement>,
        options?: TOptions
    ): Promise<EdgesAccessor.TargetFixTypedEdge<TElement, TNode, TOptions>> {
        const edges = await this.incomingEdgesOfType(constructor, options);

        expect(edges).toHaveLength(1);

        return edges[0];
    }

    async incomingEdgesOfType<TElement extends PEdge, TOptions extends EdgesAccessor.IncomingEdgesSearchOptions>(
        constructor: PEdgeConstructor<TElement>,
        options?: TOptions
    ): Promise<EdgesAccessor.TargetFixTypedEdge<TElement, TNode, TOptions>[]> {
        const graph = this.node.graph;
        const sourceId = await this.node.idAttr();

        return graph.getEdgesOfType(constructor, {
            ...options,
            targetId: sourceId,
            targetConstructor: this.sourceConstructor
        }) as any;
    }
}
