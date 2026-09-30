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
import { FeatureDefinition, defineFeature } from '@eclipse-glsp/sprotty';
import { GLSPClientFeature } from '../../client-feature-keys';

/** Lazily loaded definition of the `navigationModule` feature (see {@link GLSPClientFeature.Navigation}). */
export const navigationFeatureDef: FeatureDefinition = defineFeature(GLSPClientFeature.Navigation, () =>
    import('./navigation-module').then(m => m.navigationModule)
);
