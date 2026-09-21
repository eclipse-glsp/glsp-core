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
 * Guards the DOM contract between `@eclipse-glsp/client` and the e2e packages.
 *
 * The e2e packages do not depend on the client at runtime — they drive a diagram through a browser
 * — so the class names and attribute names they select on are copies of what the client renders.
 * Without this test the copies drift silently: renaming a class in the client breaks a Playwright
 * suite that only runs in CI, and the failure points at a timed-out locator rather than at the
 * rename that caused it.
 *
 * The client is imported through its package barrel on purpose. That the constants are reachable
 * from the public API is part of what is being guarded: an adopter writing their own page objects
 * has to be able to import them.
 */
import {
    CSS_FEEDBACK_EDGE,
    CSS_GHOST_ELEMENT,
    CSS_GROUP_HEADER,
    CSS_HEADER_TOOLS,
    CSS_LOADING_INDICATOR,
    CSS_MINIMIZE_PALETTE_BUTTON,
    CSS_TOOL_BUTTON,
    CSS_TOOL_GROUP,
    CursorCSS as ClientCursorCSS,
    RESIZE_HANDLE_KIND_ATTR,
    SVGMetadata as ClientSVGMetadata
} from '@eclipse-glsp/client';
import { ClientAttribute, ClientCSS, SVGMetadata } from '@eclipse-glsp/playwright';
import { describe, expect, it } from 'vitest';
import { CursorCSS } from './cursors-css';

describe('DOM contract with @eclipse-glsp/client', () => {
    describe('cursor CSS classes', () => {
        // Bidirectional: the e2e table is meant to be a complete mirror of the client enum. A
        // cursor the client adds without the tests learning about it is drift worth failing on,
        // so an extra entry on either side is an error.
        it('matches the client CursorCSS enum exactly', () => {
            expect({ ...CursorCSS }).toEqual({ ...ClientCursorCSS });
        });
    });

    describe('SVG metadata attributes', () => {
        // One-directional: the client may emit metadata no page object reads yet.
        it('uses the attribute names the client writes', () => {
            expect(SVGMetadata.prefix).toBe(ClientSVGMetadata.prefix);
            expect(SVGMetadata.api).toBe(ClientSVGMetadata.api);
            expect(SVGMetadata.type).toBe(ClientSVGMetadata.type);
            expect(SVGMetadata.parentId).toBe(ClientSVGMetadata.parentId);
            expect(SVGMetadata.Edge.sourceId).toBe(ClientSVGMetadata.Edge.sourceId);
            expect(SVGMetadata.Edge.targetId).toBe(ClientSVGMetadata.Edge.targetId);
        });
    });

    describe('CSS classes selected on by the page objects', () => {
        // One-directional: the client renders many classes the page objects never select on.
        it.each([
            ['TOOL_BUTTON', ClientCSS.TOOL_BUTTON, CSS_TOOL_BUTTON],
            ['TOOL_GROUP', ClientCSS.TOOL_GROUP, CSS_TOOL_GROUP],
            ['GROUP_HEADER', ClientCSS.GROUP_HEADER, CSS_GROUP_HEADER],
            ['HEADER_TOOLS', ClientCSS.HEADER_TOOLS, CSS_HEADER_TOOLS],
            ['MINIMIZE_PALETTE_BUTTON', ClientCSS.MINIMIZE_PALETTE_BUTTON, CSS_MINIMIZE_PALETTE_BUTTON],
            ['FEEDBACK_EDGE', ClientCSS.FEEDBACK_EDGE, CSS_FEEDBACK_EDGE],
            ['GHOST_ELEMENT', ClientCSS.GHOST_ELEMENT, CSS_GHOST_ELEMENT],
            ['LOADING_INDICATOR', ClientCSS.LOADING_INDICATOR, CSS_LOADING_INDICATOR]
        ])('%s matches the client constant', (_name, mirrored, client) => {
            expect(mirrored).toBe(client);
        });

        it('covers every entry of the mirrored table', () => {
            // Fails when an entry is added to `ClientCSS` without a row above, which would
            // otherwise leave the new entry unguarded.
            expect(Object.keys(ClientCSS)).toHaveLength(8);
        });
    });

    describe('DOM attributes selected on by the page objects', () => {
        it('uses the resize handle attribute the client writes', () => {
            expect(ClientAttribute.RESIZE_HANDLE_KIND).toBe(RESIZE_HANDLE_KIND_ATTR);
        });

        it('covers every entry of the mirrored table', () => {
            expect(Object.keys(ClientAttribute)).toHaveLength(1);
        });
    });
});
