/********************************************************************************
 * Copyright (c) 2019-2026 EclipseSource and others.
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
    ExportSvgCommand,
    ExportSvgPostprocessor,
    FeatureDefinition,
    FeatureModule,
    TYPES,
    bindAsService,
    configureCommand
} from '@eclipse-glsp/sprotty';
import { exportFeatureDef } from './export-features';
import { DefaultPngDiagramExporter } from './default-png-diagram-exporter';
import { DefaultSvgDiagramExporter } from './default-svg-diagram-exporter';
import { DiagramExportPostprocessor } from './diagram-export-postprocessor';
import { GLSPSvgExporter } from './glsp-svg-exporter';
import { RequestExportCommand } from './request-export-command';

export const exportModule = new FeatureModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bindAsService(context, TYPES.SvgExporter, GLSPSvgExporter);

    // Unified export pipeline.
    bindAsService(context, TYPES.HiddenVNodePostprocessor, DiagramExportPostprocessor);
    configureCommand(context, RequestExportCommand);
    bindAsService(context, TYPES.IDiagramExporter, DefaultSvgDiagramExporter);
    bindAsService(context, TYPES.IDiagramExporter, DefaultPngDiagramExporter);

    // Legacy SVG-only pipeline kept functional for adopters still dispatching the
    // deprecated `RequestExportSvgAction` / `ExportSvgAction`.
    bindAsService(context, TYPES.HiddenVNodePostprocessor, ExportSvgPostprocessor);
    configureCommand(context, ExportSvgCommand);
}, FeatureDefinition.toModuleOptions(exportFeatureDef));
