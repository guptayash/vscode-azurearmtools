/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line: no-suspicious-comment
// TODO: Remove when language server available for build
// tslint:disable-next-line: strict-boolean-expressions export-name
export const DISABLE_LANGUAGE_SERVER_TESTS: boolean = !!/^(true|1)$/i.test(process.env.DISABLE_LANGUAGE_SERVER_TESTS || '');
