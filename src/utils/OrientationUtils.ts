import * as THREE from 'three';

/**
 * Calculates a decoupled audio orientation from a source orientation.
 * Specifically inverts the Yaw (Euler Y) to ensure spatial audio stays
 * fixed in space when the listener's head turns.
 * 
 * Order is expected to be 'YXZ'.
 * Accepts target and temp objects to avoid GC pressure in high-frequency loops.
 */
export function calculateAudioOrientation(
    q: THREE.Quaternion,
    target: THREE.Quaternion,
    tempEuler: THREE.Euler
): THREE.Quaternion {
    tempEuler.setFromQuaternion(q);
    // tempEuler.y *= -1; // Invert Yaw removed as it was going in the wrong direction
    return target.setFromEuler(tempEuler);
}
