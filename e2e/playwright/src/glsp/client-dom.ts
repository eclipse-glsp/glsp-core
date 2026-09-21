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
 * The part of the `@eclipse-glsp/client` DOM that the page objects of this framework select on.
 *
 * This framework deliberately does not depend on `@eclipse-glsp/client`: it drives a diagram
 * through a browser, and pulling the client (and with it sprotty, snabbdom and inversify) into the
 * Playwright process would buy nothing at runtime. The price is that these names are a copy, and a
 * copy drifts.
 *
 * The tables are therefore mirrored here in one place instead of being spread over the page
 * objects, and `@eclipse-glsp-examples/workflow-e2e` carries a unit test that compares them against
 * the constants the client exports. Renaming a class in the client without updating this module
 * fails that test rather than a Playwright run that nobody starts until CI.
 */

/**
 * CSS classes the client renders that page objects select on.
 *
 * Mirrors the correspondingly named `CSS_*` constants of `@eclipse-glsp/client`.
 */
export const ClientCSS = {
    /** @see `CSS_TOOL_BUTTON` */
    TOOL_BUTTON: 'tool-button',
    /** @see `CSS_TOOL_GROUP` */
    TOOL_GROUP: 'tool-group',
    /** @see `CSS_GROUP_HEADER` */
    GROUP_HEADER: 'group-header',
    /** @see `CSS_HEADER_TOOLS` */
    HEADER_TOOLS: 'header-tools',
    /** @see `CSS_MINIMIZE_PALETTE_BUTTON` */
    MINIMIZE_PALETTE_BUTTON: 'minimize-palette-button',
    /** @see `CSS_FEEDBACK_EDGE` */
    FEEDBACK_EDGE: 'feedback-edge',
    /** @see `CSS_GHOST_ELEMENT` */
    GHOST_ELEMENT: 'ghost-element',
    /** @see `CSS_LOADING_INDICATOR` */
    LOADING_INDICATOR: 'loading'
} as const;

export type ClientCSS = (typeof ClientCSS)[keyof typeof ClientCSS];

/**
 * DOM attributes the client renders that page objects select on.
 *
 * The `data-svg-metadata-*` attributes are part of the same contract but have their own module,
 * see {@link SVGMetadata}.
 */
export const ClientAttribute = {
    /** @see `RESIZE_HANDLE_KIND_ATTR` */
    RESIZE_HANDLE_KIND: 'data-kind'
} as const;

export type ClientAttribute = (typeof ClientAttribute)[keyof typeof ClientAttribute];

/** The CSS selector for {@link ClientCSS} entry `cssClass`, i.e. the class name with a leading dot. */
export function classSelector(cssClass: ClientCSS): string {
    return `.${cssClass}`;
}
