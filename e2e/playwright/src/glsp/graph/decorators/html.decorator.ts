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
import { PMetadata } from './decorator';

export interface ModelElementMetadata {
    type: string;
    baseType: 'html' | 'node' | 'edge';
}

/**
 * Decorator for adding the {@link ModelElementMetadata} to a page object.
 *
 * [Learn more about metadata](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/metadata.md).
 *
 * **Usage**
 *
 * ```ts
 * \@ModelElementMetadata({
 *  type: 'marker'
 * })
 * export class Marker { ... }
 * ```
 *
 * @param metadata The metadata to use
 */
export function ModelElementMetadata(metadata: Omit<ModelElementMetadata, 'baseType'>): (constructor: any) => void {
    return (constructor: any) => {
        PMetadata.add(constructor, {
            ...metadata,
            baseType: 'html'
        });
    };
}
