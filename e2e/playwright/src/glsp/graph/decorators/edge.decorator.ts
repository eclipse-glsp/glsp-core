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
import { PEdgeConstructor } from '../elements';
import { PMetadata } from './decorator';
import { ModelElementMetadata } from './html.decorator';

export type EdgeMetadata = Omit<ModelElementMetadata, 'baseType'>;

/**
 * Decorator for adding the {@link EdgeMetadata} to an edge-based page object.
 *
 * [Learn more about metadata](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/metadata.md).
 *
 * **Usage**
 *
 * ```ts
 * \@EdgeMetadata({
 *  type: 'edge:weighted'
 * })
 * export class Edge { ... }
 * ```
 *
 * @param metadata The metadata to use
 */
export function EdgeMetadata(metadata: EdgeMetadata): (constructor: PEdgeConstructor) => void {
    return (constructor: PEdgeConstructor) => {
        PMetadata.add(constructor, {
            ...metadata,
            baseType: 'edge'
        });
    };
}
