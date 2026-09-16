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
import { Selectable } from '../../extension';
import { PLabelledElement } from '../../extension/model/labelled/labelled-element.model';
import { PEdge, PEdgeConstructor, PModelElement, PModelElementConstructor, PNode, PNodeConstructor } from './elements';
import { GLSPGraph } from './graph.po';
import type { GraphConstructorOptions } from './graph.type';
import { SVGMetadataUtils } from './svg-metadata-api';

/**
 * The {@link GLSPSemanticGraph} allows compared to {@link GLSPGraph} semantic access.
 * Element specific knowledge (e.g., {@link PLabelledElement}) is used to search for elements.
 */
export class GLSPSemanticGraph extends GLSPGraph {
    async getNodeByLabel<TElement extends PNode & PLabelledElement>(
        label: string,
        constructor: PNodeConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement> {
        const nodes = await this.getNodesByLabel(label, constructor, options);

        expect(nodes).toHaveLength(1);

        return nodes[0];
    }

    async getNodesByLabel<TElement extends PNode & PLabelledElement>(
        label: string,
        constructor: PNodeConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement[]> {
        const nodes = await this.getNodes(`${SVGMetadataUtils.typeAttrOf(constructor)}:has-text("${label}")`, constructor, options);
        const elements: TElement[] = [];

        for (const node of nodes) {
            const nodeLabel = await node.label;
            if (nodeLabel === label) {
                elements.push(node);
            }
        }

        return elements;
    }

    async getEdgeBetween<TElement extends PEdge>(
        constructor: PEdgeConstructor<TElement>,
        options: {
            sourceNode: PNode;
            targetNode: PNode;
        }
    ): Promise<TElement> {
        const edges = await this.getEdgesOfType(constructor, {
            sourceSelectorOrLocator: options.sourceNode.locate(),
            targetSelectorOrLocator: options.targetNode.locate()
        });

        expect(edges).toHaveLength(1);

        return edges[0];
    }

    async getEdgesBetween<TElement extends PEdge>(
        constructor: PEdgeConstructor<TElement>,
        options: {
            sourceNode: PNode;
            targetNode: PNode;
        }
    ): Promise<TElement[]> {
        return this.getEdgesOfType(constructor, {
            sourceSelectorOrLocator: options.sourceNode.locate(),
            targetSelectorOrLocator: options.targetNode.locate()
        });
    }

    async getSelectedElements<TElement extends PModelElement>(constructor: PModelElementConstructor<TElement>): Promise<TElement[]> {
        return this.getModelElements(`.${Selectable.CSS}`, constructor);
    }
}
