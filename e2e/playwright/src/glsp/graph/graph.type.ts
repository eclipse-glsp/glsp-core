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
import type { Locator } from '@playwright/test';
import type { PEdge } from './elements/edge';
import type { PModelElement } from './elements/element';
import type { PNodeConstructor } from './elements/node';
import type { BothTypedEdge, SourceTypedEdge, TargetTypedEdge } from './elements/typed-edge/typed-edge.type';

export interface GraphConstructorOptions {
    /**
     * If any assertions should be triggered
     */
    assert?: boolean;
}

export interface EdgeConstructorOptions extends GraphConstructorOptions {
    sourceConstructor?: PNodeConstructor<any>;
    targetConstructor?: PNodeConstructor<any>;
}

export interface EdgeSearchOptions extends EdgeConstructorOptions {
    sourceId?: string;
    targetId?: string;
    sourceSelectorOrLocator?: string | Locator;
    targetSelectorOrLocator?: string | Locator;
}

export type TypedEdge<TElement extends PEdge, TOptions extends EdgeConstructorOptions> = TOptions extends {
    sourceConstructor: PNodeConstructor<infer TSource>;
    targetConstructor: PNodeConstructor<infer TTarget>;
}
    ? TElement & BothTypedEdge<TSource, TTarget>
    : TOptions extends { sourceConstructor: PNodeConstructor<infer TSource> }
      ? TElement & SourceTypedEdge<TSource>
      : TOptions extends { targetConstructor: PNodeConstructor<infer TTarget> }
        ? TElement & TargetTypedEdge<TTarget>
        : TElement;

export interface ElementQuery<TElement extends PModelElement> {
    elementType: string;
    all: () => Promise<TElement[]>;
    filter?: (elements: TElement[]) => Promise<TElement[]>;
}

export namespace ElementQuery {
    export async function exec<TElement extends PModelElement>(query: ElementQuery<TElement>): Promise<TElement[]> {
        const elements = await query.all();
        return query.filter?.(elements) ?? elements;
    }
}
