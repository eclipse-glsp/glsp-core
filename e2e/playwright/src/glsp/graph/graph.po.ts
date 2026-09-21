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
import type { GLSPApp } from '..';
import { GLSPLocator, type LocateContext } from '../../remote';
import { definedAttr, isUndefinedOrValue } from '../../utils/ts.utils';
// Imported directly instead of via the `../../test` barrel: that barrel also pulls in
// `test/test.ts`, which imports the integration barrel and would close a runtime import cycle.
import { expect } from '../../test/assertions';
import { ModelElementMetadata, PMetadata } from './decorators';
import { assertEqualType, createTypedEdgeProxy, getPModelElementConstructorOfType } from './elements';
import { isPEdgeConstructor, PEdge, PEdgeConstructor } from './elements/edge';
import { isEqualLocatorType, PModelElement, PModelElementConstructor } from './elements/element';
import { isPNodeConstructor, PNode, PNodeConstructor } from './elements/node';
import type { EdgeConstructorOptions, EdgeSearchOptions, GraphConstructorOptions, TypedEdge } from './graph.type';
import { SVGMetadata, SVGMetadataUtils } from './svg-metadata-api';
import { ClientCSS, classSelector } from '../client-dom';

export interface GLSPGraphOptions {
    locator: GLSPLocator;
}

/**
 * The {@link GLSPGraph} interacts with the graph (e.g., SVG) part of the GLSP-Client.
 * It provides basic functionality like searching for specific elements or to wait for their creation.
 *
 * **Note**
 *
 * The {@link GLSPGraph} is language-agnostic, that means it has no semantic knowledge.
 * It works directy with the underlying DOM by using the selector, {@link Locator},
 * or constructor (e.g., {@link PModelElementConstructor}) of an element.
 */
@ModelElementMetadata({
    type: 'graph'
})
export class GLSPGraph extends PModelElement {
    static locate(app: GLSPApp): GLSPLocator {
        return app.locator.child(SVGMetadataUtils.typeAttrOf('graph'));
    }

    constructor(protected readonly options: GLSPGraphOptions) {
        super({
            locator: options.locator
        });
    }

    protected getLocatorForType(constructor: PModelElementConstructor, context: LocateContext = 'self'): Locator {
        return this.locate(context).locator(SVGMetadataUtils.typeAttrOf(constructor));
    }

    async getModelElement<TElement extends PModelElement>(
        selectorOrLocator: string | Locator,
        constructor: PModelElementConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement> {
        const locator = GLSPLocator.asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
        const element = new constructor({ locator: this.locator.override(locator) });
        if (options === undefined || isUndefinedOrValue(options.assert, true)) {
            await assertEqualType(element);
            await element.snapshot();
        }
        return element;
    }

    async getModelElementsOfType<TElement extends PModelElement>(
        constructor: PModelElementConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement[]> {
        return this.getModelElements(this.getLocatorForType(constructor), constructor, options);
    }

    async getModelElements<TElement extends PModelElement>(
        selectorOrLocator: string | Locator,
        constructor: PModelElementConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement[]> {
        const locator = GLSPLocator.asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
        const elements: TElement[] = [];

        for await (const childLocator of await locator.all()) {
            if ((await childLocator.count()) > 0) {
                const id = await childLocator.getAttribute('id');
                if (id !== null && (await isEqualLocatorType(childLocator, constructor))) {
                    elements.push(await this.getModelElement(`id=${id}`, constructor, options));
                }
            }
        }

        return elements;
    }

    async getAllModelElements(): Promise<PModelElement[]> {
        return this.getModelElements(`[${SVGMetadata.type}]`, PModelElement);
    }

    async getNode<TElement extends PNode>(
        selectorOrLocator: string | Locator,
        constructor: PNodeConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement> {
        const locator = GLSPLocator.asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
        const element = new constructor({
            locator: this.locator.override(locator.and(this.getLocatorForType(constructor, 'root')))
        });
        if (options === undefined || isUndefinedOrValue(options.assert, true)) {
            await assertEqualType(element);
        }
        return element;
    }

    async getNodesOfType<TElement extends PNode>(
        constructor: PNodeConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement[]> {
        return this.getNodes(this.getLocatorForType(constructor), constructor, options);
    }

    async getNodes<TElement extends PNode>(
        selectorOrLocator: string | Locator,
        constructor: PNodeConstructor<TElement>,
        options?: GraphConstructorOptions
    ): Promise<TElement[]> {
        const locator = GLSPLocator.asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
        const elements: TElement[] = [];

        for await (const childLocator of await locator.all()) {
            if ((await childLocator.count()) > 0) {
                const id = await childLocator.getAttribute('id');
                if (id !== null && (await isEqualLocatorType(childLocator, constructor))) {
                    elements.push(await this.getNode(`id=${id}`, constructor, options));
                }
            }
        }

        return elements;
    }

    async getEdge<TElement extends PEdge, TOptions extends EdgeConstructorOptions>(
        selectorOrLocator: string | Locator,
        constructor: PEdgeConstructor<TElement>,
        options?: TOptions
    ): Promise<TypedEdge<TElement, TOptions>> {
        const locator = GLSPLocator.asLocator(selectorOrLocator, selector => this.locator.child(selector).locate());
        const element = new constructor({
            locator: this.locator.override(locator.and(this.getLocatorForType(constructor, 'root')))
        });
        await assertEqualType(element);
        return createTypedEdgeProxy<TElement, TOptions>(element, options);
    }

    async getEdgesOfType<TElement extends PEdge, TOptions extends EdgeSearchOptions>(
        constructor: PEdgeConstructor<TElement>,
        options?: TOptions
    ): Promise<TypedEdge<TElement, TOptions>[]> {
        const elements: TypedEdge<TElement, TOptions>[] = [];

        let query = SVGMetadataUtils.typeAttrOf(constructor);
        if (options?.sourceId) {
            query += `[${SVGMetadata.Edge.sourceId}="${options.sourceId}"]`;
        } else if (options?.targetId) {
            query += `[${SVGMetadata.Edge.targetId}="${options.targetId}"]`;
        }

        for await (const locator of await this.locate().locator(query).all()) {
            const id = await locator.getAttribute('id');
            if (id !== null && (await isEqualLocatorType(locator, constructor))) {
                const element = await this.getEdge(`id=${id}`, constructor, options);
                const sourceChecks = [];
                const targetChecks = [];

                if (options?.sourceConstructor) {
                    const sourceId = await element.sourceId();
                    sourceChecks.push(
                        (await this.locate()
                            .locator(`[id$="${sourceId}"]${SVGMetadataUtils.typeAttrOf(options.sourceConstructor)}`)
                            .count()) > 0
                    );
                }

                if (options?.targetConstructor) {
                    const targetId = await element.targetId();
                    targetChecks.push(
                        (await this.locate()
                            .locator(`[id$="${targetId}"]${SVGMetadataUtils.typeAttrOf(options.targetConstructor)}`)
                            .count()) > 0
                    );
                }

                if (options?.sourceSelectorOrLocator) {
                    const sourceLocator = GLSPLocator.asLocator(options.sourceSelectorOrLocator, selector =>
                        this.locate().locator(selector)
                    );
                    const sourceId = await element.sourceId();
                    const expectedId = await definedAttr(sourceLocator, 'id');
                    sourceChecks.push(expectedId.includes(sourceId));
                }

                if (options?.targetSelectorOrLocator) {
                    const targetLocator = GLSPLocator.asLocator(options.targetSelectorOrLocator, selector =>
                        this.locate().locator(selector)
                    );
                    const targetId = await element.targetId();
                    const expectedId = await definedAttr(targetLocator, 'id');
                    sourceChecks.push(expectedId.includes(targetId));
                }

                if (sourceChecks.every(c => c) && targetChecks.every(c => c)) {
                    elements.push(element);
                }
            }
        }

        return elements;
    }

    /**
     * Focuses the graph by clicking on it
     */
    async focus(): Promise<void> {
        await this.locate().click();
    }

    /**
     * Waits for the creation of an element of a specific type.
     * The creation is detected by waiting for a new element to be visible.
     */
    async waitForCreationOfType<TElement extends PModelElement>(
        constructor: PModelElementConstructor<TElement>,
        creator: () => Promise<void>
    ): Promise<TElement[]> {
        const elementType = PMetadata.getType(constructor);

        const ids = await this.waitForCreation(elementType, creator);

        return this.idsAsElements(ids, constructor);
    }

    /**
     * Waits for the creation of an element of a specific type.
     * The creation is detected by waiting for a new element to be visible.
     */
    async waitForCreation(elementType: string, creator: () => Promise<void>): Promise<string[]> {
        const nodes = await this.getModelElementsOfType(getPModelElementConstructorOfType(elementType));
        const ids = await Promise.all(nodes.map(n => n.idAttr()));

        await expect(async () => {
            await creator();
        }).toPass();

        // Exclude transient creation feedback in addition to the already-present elements.
        // This ensures stability against timing issues under load
        const ignore = [classSelector(ClientCSS.GHOST_ELEMENT), classSelector(ClientCSS.FEEDBACK_EDGE), ...ids.map(id => `[id="${id}"]`)];
        const createdLocator = this.locate().locator(`[data-svg-metadata-type="${elementType}"]:not(${ignore.join(',')})`);

        await expect(createdLocator.first()).toBeVisible();
        await expect(createdLocator.last()).toBeVisible();

        const newIds: string[] = [];
        for (const locator of await createdLocator.all()) {
            newIds.push(await definedAttr(locator, 'id'));
        }

        return newIds;
    }

    /**
     * Waits for the replacement of an element of a specific type.
     * The replacement is detected by waiting for the removal of the element and the creation of a new one.
     */
    async waitForReplacement(elementType: string, run: () => Promise<void>): Promise<string[]>;
    async waitForReplacement<TElement extends PModelElement>(
        constructor: PModelElementConstructor<TElement>,
        run: () => Promise<void>
    ): Promise<TElement[]>;
    async waitForReplacement(
        elementTypeOrConstructor: string | PModelElementConstructor,
        run: () => Promise<void>
    ): Promise<string[] | PModelElement[]> {
        const elementType =
            typeof elementTypeOrConstructor === 'string' ? elementTypeOrConstructor : PMetadata.getType(elementTypeOrConstructor);

        const nodes = await this.getModelElementsOfType(getPModelElementConstructorOfType(elementType));
        const removal = GLSPLocator.or(...nodes.map(n => n.locate()));

        const ids = await this.waitForCreation(elementType, run);

        await expect(removal).toBeHidden();

        if (typeof elementTypeOrConstructor === 'string') {
            return ids;
        }

        return this.idsAsElements(ids, elementTypeOrConstructor);
    }

    async waitForHide(selectorOrLocator: string | Locator | GLSPLocator, run: () => Promise<void>): Promise<void> {
        const locator = GLSPLocator.asLocator(selectorOrLocator, selector => this.locate().locator(selector));
        await expect(locator).toBeVisible();
        await run();
        await expect(locator).toBeHidden();
    }

    /**
     * Converts a list of ids to elements of a specific type.
     */
    async idsAsElements<TElement extends PModelElement>(
        ids: string[],
        constructor: PModelElementConstructor<TElement>
    ): Promise<TElement[]> {
        let retriever = this.getModelElement.bind(this);
        if (isPNodeConstructor(constructor)) {
            retriever = this.getNode.bind(this) as any;
        } else if (isPEdgeConstructor(constructor)) {
            retriever = this.getEdge.bind(this) as any;
        }

        return Promise.all(ids.map(id => retriever(`id=${id}`, constructor)));
    }
}
