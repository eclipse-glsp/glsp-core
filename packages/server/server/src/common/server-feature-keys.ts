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
import { GLSPCapability, GLSPFeatureKey } from '@eclipse-glsp/protocol';

/**
 * The {@link GLSPFeatureKey}s of all GLSP server features.
 *
 * Includes the keys of all {@link GLSPCapability}s, i.e. every capability is reported under the key of the server feature
 * that provides it, plus the core features that are not reported as capabilities.
 * Use these keys to reference a feature (e.g. in `requiredFeatures` or in a `remove` configuration of a diagram setup)
 * without importing its implementation. This file must not import any implementation.
 *
 * Adopters define their features in their own registry and namespace:
 * ```typescript
 * export const MyFeature = { Simulation: 'myCompany.simulation' } as const satisfies Record<string, FeatureKey>;
 * ```
 */
export const GLSPServerFeature = {
    ...GLSPCapability,
    /** Core session bindings (see `BaseDiagramModule`). */
    Base: 'glsp.base',
    /** The source model of a diagram language (see `SourceModelModule`). */
    SourceModel: 'glsp.sourceModel',
    /** Operation handling (see `OperationsModule`). */
    Operations: 'glsp.operations'
} as const satisfies Record<string, GLSPFeatureKey>;

/** The union of all GLSPServerFeature keys. */
export type GLSPServerFeature = (typeof GLSPServerFeature)[keyof typeof GLSPServerFeature];
