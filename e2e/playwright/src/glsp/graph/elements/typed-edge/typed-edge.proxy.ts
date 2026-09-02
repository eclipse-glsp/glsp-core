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
import type { PEdge } from '../../elements/edge';
import type { EdgeConstructorOptions, TypedEdge } from '../../graph.type';
import type { BothTypedEdge } from './typed-edge.type';

type keys = keyof BothTypedEdge<any, any>;

export function createTypedEdgeProxy<TElement extends PEdge, TOptions extends EdgeConstructorOptions>(
    edge: TElement,
    options?: EdgeConstructorOptions
): TypedEdge<TElement, TOptions> {
    const proxy = new Proxy(edge, {
        get: (target, name, receiver) => {
            const proxiedKeys = name as keys;
            if (proxiedKeys === 'source') {
                return () => {
                    if (options?.sourceConstructor !== undefined) {
                        return target.sourceOfType(options.sourceConstructor);
                    }

                    throw new TypeError('No source constructor provided');
                };
            } else if (proxiedKeys === 'target') {
                return () => {
                    if (options?.targetConstructor !== undefined) {
                        return target.targetOfType(options.targetConstructor);
                    }

                    throw new TypeError('No target constructor provided');
                };
            }

            return Reflect.get(target, name, receiver);
        }
    });

    return proxy as any;
}
