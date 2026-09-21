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
 * Names of the SVG metadata attributes that {@link MetadataPlacer} writes onto the rendered
 * diagram.
 *
 * These attributes exist so that tools outside the diagram — most notably the Playwright page
 * objects of `@eclipse-glsp/playwright` — can address model elements by their semantic type and
 * containment instead of by generated DOM ids. They are therefore a contract with those consumers,
 * not an implementation detail: renaming one here silently breaks every test that selects on it.
 *
 * **DOM**
 *
 * ```html
 * <g id="sprotty_task0"
 *  data-svg-metadata-type="task:manual"
 *  data-svg-metadata-parent-id="sprotty_sprotty" ...>
 *   ...
 * </g>
 * ```
 */
export namespace SVGMetadata {
    export const prefix = 'data-svg-metadata' as const;

    /** Marks the model root, i.e. the element that hosts the diagram. */
    export const api = `${prefix}-api` as const;
    /** Holds the {@link GModelElement.type} of the rendered element. */
    export const type = `${prefix}-type` as const;
    /** Holds the DOM id of the parent element, for elements that have one. */
    export const parentId = `${prefix}-parent-id` as const;

    export namespace Edge {
        export const edgePrefix = `${SVGMetadata.prefix}-edge` as const;
        /** Holds the DOM id of the edge source, if the edge has one. */
        export const sourceId = `${edgePrefix}-source-id` as const;
        /** Holds the DOM id of the edge target, if the edge has one. */
        export const targetId = `${edgePrefix}-target-id` as const;
    }
}
