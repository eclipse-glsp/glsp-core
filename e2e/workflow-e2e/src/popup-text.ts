/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
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
/**
 * @module
 *
 * Popup fixtures shared by the popup tests.
 *
 * They live here rather than in a spec file because the popup tests are split across
 * integrations: the integration-agnostic ones and the Theia specific one both need them.
 */
import { GLSPServer, PLabelledElement, PNode, PNodeConstructor, PopupCapability, ServerVariable, expect } from '@eclipse-glsp/playwright';
import { dedent } from 'ts-dedent';
import type { WorkflowApp } from './app/workflow-app';
import { GLSP_SERVER_TYPE_JAVA, GLSP_SERVER_TYPE_NODE } from './server';

export const manualLabel = 'Push';

// Unbound on purpose: the texts are looked up per call, so nothing has to bind a server
// into module state before a test can read them.
const manualPopupTexts = new ServerVariable({
    value: {
        [GLSP_SERVER_TYPE_NODE]: dedent`Push
        Type: manual
        Duration: undefined
        Reference: undefined

        `,
        [GLSP_SERVER_TYPE_JAVA]: dedent`Push

        Type: manual
        Duration: 0
        Reference: null

        `
    }
});

/** Returns the popup text the given server produces for the manual task. */
export function expectedManualPopupText(server: GLSPServer): string {
    return manualPopupTexts.getOrThrow(server.type);
}

export const automatedLabel = 'ChkWt';

const automatedPopupTexts = new ServerVariable({
    value: {
        [GLSP_SERVER_TYPE_NODE]: dedent`ChkWt
        Type: automated
        Duration: undefined
        Reference: undefined

        `,
        [GLSP_SERVER_TYPE_JAVA]: dedent`ChkWt

        Type: automated
        Duration: 0
        Reference: null

        `
    }
});

/** Returns the popup text the given server produces for the automated task. */
export function expectedAutomatedPopupText(server: GLSPServer): string {
    return automatedPopupTexts.getOrThrow(server.type);
}

/**
 * Hovers the node with the given label and asserts that its popup shows the expected text.
 *
 * @param app App under test
 * @param label Label of the node to hover
 * @param constructor Page object constructor of the node
 * @param expectedText Text the popup is expected to show
 * @returns The hovered node
 */
export async function assertPopup<T extends PNode & PLabelledElement & PopupCapability>(
    app: WorkflowApp,
    label: string,
    constructor: PNodeConstructor<T>,
    expectedText: string
): Promise<T> {
    const node = await app.graph.getNodeByLabel(label, constructor);
    await expect(app.popup.locate()).toBeHidden();
    const text = await node.popupText();
    await expect(app.popup.locate()).toBeVisible();
    expect(text).toBe(expectedText);
    return node;
}
