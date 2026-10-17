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
import {
    DefaultTypes,
    DiagramConfiguration,
    EdgeTypeHint,
    getDefaultMapping,
    GModelElementConstructor,
    ServerLayoutKind,
    ShapeTypeHint
} from '@eclipse-glsp/server';
import { injectable } from 'inversify';

const CONNECTABLE_TYPES = [DefaultTypes.NODE, DefaultTypes.PORT];

/** Maps only the default GModel types and allows every interaction; files restrict behavior via model data (e.g. `moveMode`). */
@injectable()
export class GModelDemoDiagramConfiguration implements DiagramConfiguration {
    get typeMapping(): Map<string, GModelElementConstructor> {
        return getDefaultMapping();
    }

    get shapeTypeHints(): ShapeTypeHint[] {
        // Labels have to be repositionable, otherwise the client never makes them movable.
        return [DefaultTypes.NODE, DefaultTypes.PORT, DefaultTypes.LABEL, DefaultTypes.COMPARTMENT].map(elementTypeId => ({
            elementTypeId,
            repositionable: true,
            deletable: true,
            resizable: true,
            reparentable: true
        }));
    }

    get edgeTypeHints(): EdgeTypeHint[] {
        return [
            {
                elementTypeId: DefaultTypes.EDGE,
                repositionable: true,
                deletable: true,
                routable: true,
                sourceElementTypeIds: CONNECTABLE_TYPES,
                targetElementTypeIds: CONNECTABLE_TYPES
            }
        ];
    }

    layoutKind = ServerLayoutKind.MANUAL;
    needsClientLayout = true;
    animatedUpdate = true;
}
