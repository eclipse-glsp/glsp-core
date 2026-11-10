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

import { describe, expect, it } from 'vitest';
import { deriveReleaseVersion } from './release';
import { getActiveSection } from './release-checks';
import { isDevelopmentVersion, nextDevelopmentVersion, releaseCommand } from './release-state';

describe('releng release', () => {
    describe('deriveReleaseVersion', () => {
        it('derives the release version from a development version', () => {
            expect(deriveReleaseVersion('2.9.0-next', 'minor')).toBe('2.9.0');
            expect(deriveReleaseVersion('2.9.0-next', 'major')).toBe('3.0.0');
            expect(deriveReleaseVersion('2.9.0-SNAPSHOT', 'patch')).toBe('2.9.0');
        });

        it('uses a valid custom version', () => {
            expect(deriveReleaseVersion('2.9.0-next', 'custom', '2.9.1')).toBe('2.9.1');
            expect(() => deriveReleaseVersion('2.9.0-next', 'custom', 'nope')).toThrow(/valid custom version/);
            expect(() => deriveReleaseVersion('2.9.0-next', 'custom')).toThrow(/valid custom version/);
        });

        it('only starts a release from a development version', () => {
            expect(() => deriveReleaseVersion('2.9.0', 'minor')).toThrow(/release version 2.9.0/);
        });

        it('only allows final releases, which the publishing workflows accept', () => {
            expect(() => deriveReleaseVersion('2.9.0-next', 'custom', '2.9.0-rc.1')).toThrow(/Only final releases/);
        });
    });

    describe('versions', () => {
        it('recognizes npm and Maven development versions', () => {
            expect(isDevelopmentVersion('2.9.0-next')).toBe(true);
            expect(isDevelopmentVersion('2.9.0-SNAPSHOT')).toBe(true);
            expect(isDevelopmentVersion('2.9.0')).toBe(false);
        });

        it('switches to the next minor development version after a release', () => {
            expect(nextDevelopmentVersion('2.9.0')).toBe('2.10.0-next');
            expect(nextDevelopmentVersion('2.9.1')).toBe('2.10.0-next');
        });
    });

    describe('releaseCommand', () => {
        it('only passes the owner for forks', () => {
            expect(releaseCommand({ repo: 'glsp-server', owner: 'eclipse-glsp' }, 'tag')).toBe(
                'glsp releng release tag --repo glsp-server'
            );
            expect(releaseCommand({ repo: 'glsp-server', owner: 'me' }, 'tag')).toBe(
                'glsp releng release tag --repo glsp-server --owner me'
            );
        });
    });

    describe('getActiveSection', () => {
        const changelog = [
            '# Changelog',
            '',
            '## v2.9.0 - active',
            '',
            '### Client',
            '',
            '#### Changes',
            '',
            '- [diagram] A change',
            '',
            '## [v2.8.0 - 31/08/2026](https://example)',
            '',
            '- An old change'
        ].join('\n');

        it('returns the body of the active section up to the next release', () => {
            const section = getActiveSection(changelog, '2.9.0');
            expect(section).toContain('- [diagram] A change');
            expect(section).not.toContain('An old change');
        });

        it('returns undefined without an active section of the version', () => {
            expect(getActiveSection(changelog, '2.10.0')).toBeUndefined();
            expect(getActiveSection(changelog, '2.8.0')).toBeUndefined();
        });
    });
});
