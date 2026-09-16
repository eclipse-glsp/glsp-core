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
import { Locator } from '@playwright/test';
import { SVGMetadata } from '../glsp/graph/svg-metadata-api';
import { GLSPLocator } from '../remote';

export interface DebugNode {
    id: string | null;
    type: string | null;
    parent: string | null;
    html: string | null;
    class: string | null;
    children: DebugNode[];
}

/**
 * Extracts the SVG Metadata tree from a locator for debugging purposes.
 *
 * @param locator Locator of the element
 * @returns The SVG Metadata tree of the node
 */
export async function extractMetaTree(locator: Locator): Promise<DebugNode> {
    const children: DebugNode[] = [];
    for (const loc of await locator.locator(`[${SVGMetadata.type}]`).all()) {
        const child = await extractMetaTree(loc);
        children.push(child);
    }

    const element = await extractElement(locator);
    return {
        ...element,
        children
    };
}

/**
 * Extracts for a single element the SVG Metadata
 *
 * @param locator Locator of the element
 * @returns For a single node the SVG Metadata
 */
export async function extractElement(locator: Locator): Promise<DebugNode> {
    return {
        id: await locator.getAttribute('id'),
        type: await locator.getAttribute(SVGMetadata.type),
        parent: await locator.getAttribute(SVGMetadata.parentId),
        children: [],
        html: (await locator.allTextContents()).join(','),
        class: await locator.getAttribute('class')
    };
}

export interface DebugGLSPLocator {
    locator: string;
    children: string[];
}

/**
 * This function extracts structured debugging information from a given GLSPLocator.
 * It processes the provided locator and its ancestors, detailing its locator and a simplified version of its children's HTML content,
 * aimed at aiding in debugging.
 * The traversal ends when there are no more parent locators anymore.
 */
export async function extractDebugInformationOfGLSPLocator(glspLocator: GLSPLocator): Promise<DebugGLSPLocator[]> {
    let elementLocator: GLSPLocator | undefined = glspLocator;
    const extracted: DebugGLSPLocator[] = [];

    while (elementLocator !== undefined) {
        const locator = elementLocator.locate();
        const children: string[] = [];

        const all = await locator.all();
        for (const l of all) {
            children.push(
                await l.evaluate(h => {
                    const cloned = h.cloneNode(false) as HTMLElement;
                    cloned.textContent = '...';

                    return cloned.outerHTML;
                })
            );
        }

        extracted.push({
            locator: locator + '',
            children
        });

        elementLocator = elementLocator.parent;
    }

    return extracted;
}
