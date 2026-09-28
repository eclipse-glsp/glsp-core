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
    ExportResultAction,
    ExportSvgAction,
    FeatureDefinition,
    FeatureModule,
    TYPES,
    bindAsService,
    configureActionHandler
} from '@eclipse-glsp/sprotty';
import { standaloneExportFeatureDef } from './standalone-export-feature';
import { ExportResultActionHandler } from '../../../../features/export/export-result-action-handler';
import { ExportSvgActionHandler } from '../../../../features/export/export-svg-action-handler';
import { RequestExportKeyListener } from '../../../../features/export/request-export-key-listener';

/**
 * Feature module that is intended for the standalone deployment of GLSP (i.e. plain webapp)
 * When integrated into an application frame (e.g Theia/VS Code) this module is typically omitted and/or replaced
 * with an application native module.
 */
export const standaloneExportModule = new FeatureModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bindAsService(context, TYPES.KeyListener, RequestExportKeyListener);
    bind(ExportResultActionHandler).toSelf().inSingletonScope();
    configureActionHandler(context, ExportResultAction.KIND, ExportResultActionHandler);

    // Legacy download path: bound so adopters dispatching `ExportSvgAction` still get a download.
    bind(ExportSvgActionHandler).toSelf().inSingletonScope();
    configureActionHandler(context, ExportSvgAction.KIND, ExportSvgActionHandler);
}, FeatureDefinition.toModuleOptions(standaloneExportFeatureDef));
