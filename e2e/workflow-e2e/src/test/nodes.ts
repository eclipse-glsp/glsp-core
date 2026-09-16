/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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

import { GLSPServer, ServerVariable } from '@eclipse-glsp/playwright';
import { GLSP_SERVER_TYPE_JAVA, GLSP_SERVER_TYPE_NODE } from '../server';

export namespace TaskAutomatedNodes {
    export const wtokLabel = 'WtOK';
    export const chkwtLabel = 'ChkWt';
    export const chktpLabel = 'ChkTp';
    export const brewLabel = 'Brew';
    export const keepTpLabel = 'KeepTp';
    export const preheatLabel = 'PreHeat';
}

export namespace TaskManualNodes {
    export const pushLabel = 'Push';
    export const rflwtLabel = 'RflWt';

    export function createdLabel(server: GLSPServer): ServerVariable<string> {
        return new ServerVariable<string>({
            server,
            defaultValue: 'ManualTask8'
        });
    }
}

export namespace CategoryNodes {
    export function createdLabel(server: GLSPServer): ServerVariable<string> {
        return new ServerVariable<string>({
            server,
            value: {
                [GLSP_SERVER_TYPE_NODE]: 'Category0',
                [GLSP_SERVER_TYPE_JAVA]: 'Category 0'
            }
        });
    }
}
