/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** True once this page has actually started recording (not merely configured). */
let _hasRecording = false;

export function markReplayRecording() {
    _hasRecording = true;
}

export function clearReplayRecording() {
    _hasRecording = false;
}

/** @returns {boolean} */
export function hasReplayRecording() {
    return _hasRecording;
}
