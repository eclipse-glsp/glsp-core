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
import { PMetadata } from './decorators';
import type { PModelElementConstructor } from './elements';

/**
 * Constants for the [SVG-Metadata](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/metadata.md).
 * Constants are defined for the attribute names for easier usage.
 *
 * **DOM**
 *
 * ```html
 * <g id="sprotty_task0"
 *  data-svg-metadata-type="task:manual"
 *  data-svg-metadata-parent-id="sprotty_sprotty" ...>
 *   ...
 *    <g ...
 *      data-svg-metadata-type="icon"
 *      data-svg-metadata-parent-id="sprotty_task0" ...>...</g>
 *    ...
 *    <text ...
 *      data-svg-metadata-type="label:heading"
 *      data-svg-metadata-parent-id="sprotty_task0" ...>...</text>
 *    ...
 * </g>
 * ```
 */
export namespace SVGMetadata {
    export const prefix = 'data-svg-metadata' as const;

    export const api = `${prefix}-api` as const;
    export const type = `${prefix}-type` as const;
    export const parentId = `${prefix}-parent-id` as const;

    export namespace Edge {
        export const edgePrefix = `${SVGMetadata.prefix}-edge` as const;
        export const sourceId = `${edgePrefix}-source-id` as const;
        export const targetId = `${edgePrefix}-target-id` as const;
    }
}

/**
 * Utility functions for the [SVG-Metadata](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/metadata.md).
 */
export namespace SVGMetadataUtils {
    /**
     * Transforms the input into an attribute selector by using the {@link SVGMetadata.type} as key.
     *
     * **Example**
     *
     * ```ts
     * typeAttrOf('foo'); // => [bar-attribute='foo']
     * ```
     *
     * @param value String to use as the value
     * @returns Selector for the type
     */
    export function typeAttrOf(value: string): string;
    export function typeAttrOf(value: PModelElementConstructor): string;
    export function typeAttrOf(value: string | PModelElementConstructor): string {
        const type = typeof value === 'string' ? value : PMetadata.getType(value);
        return `[${SVGMetadata.type}="${type}"]`;
    }

    export const apiAttr = `[${SVGMetadata.api}]`;
}
