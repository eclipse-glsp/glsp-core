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
import config from './oxlintrc.json' with { type: 'json' };

/**
 * The shared GLSP oxlint configuration as a plain object, for use in `extends` of an `oxlint.config.ts`.
 *
 * `oxlintrc.json` is the single source of truth. The only adjustment made here is the copyright year in the
 * template of the `header/header` rule: the JSON file carries the year of the last release, this module
 * substitutes the current year so that `oxlint --fix` inserts up-to-date headers.
 */
const year = new Date().getFullYear();
const [severity, style, [header]] = config.rules['header/header'];

export default {
    ...config,
    rules: {
        ...config.rules,
        'header/header': [
            severity,
            style,
            [{ ...header, template: header.template.replace(/Copyright \(c\) \d{4}/, `Copyright (c) ${year}`) }]
        ]
    }
};
