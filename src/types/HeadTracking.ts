export const SAB_SCHEMA = {
    // Int32 view
    SEQ_NUM: 0,

    // Float32 view (byte offsets / 4)
    QUAT_RAW_X: 1,
    QUAT_RAW_Y: 2,
    QUAT_RAW_Z: 3,
    QUAT_RAW_W: 4,

    QUAT_PRED_X: 5,
    QUAT_PRED_Y: 6,
    QUAT_PRED_Z: 7,
    QUAT_PRED_W: 8,

    // Total size in bytes:
    // 1 * 4 (Int32) + 8 * 4 (Float32) = 36 bytes. We'll round up to 64 bytes for cache line safety.
    BYTE_LENGTH: 64
};

export interface HeadTrackingMessage {
    type: 'START_TRACKING' | 'STOP_TRACKING' | 'INIT_WORKER' | 'PROCESS_FRAME';
    payload?: any;
}
