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

    // UI Camera Rotation (Manual)
    QUAT_UI_X: 9,
    QUAT_UI_Y: 10,
    QUAT_UI_Z: 11,
    QUAT_UI_W: 12,

    // Audio-specific orientation (Yaw inverted)
    // ADTRK = Audio Decoupled Tracking
    QUAT_ADTRK_X: 13,
    QUAT_ADTRK_Y: 14,
    QUAT_ADTRK_Z: 15,
    QUAT_ADTRK_W: 16,

    // ADUI = Audio Decoupled UI (Manual)
    QUAT_ADUI_X: 17,
    QUAT_ADUI_Y: 18,
    QUAT_ADUI_Z: 19,
    QUAT_ADUI_W: 20,

    // Total size in bytes:
    // 1 * 4 (Int32) + 20 * 4 (Float32) = 84 bytes. We'll round up to 128 bytes.
    BYTE_LENGTH: 128
};

export interface HeadTrackingMessage {
    type: 'START_TRACKING' | 'STOP_TRACKING' | 'INIT_WORKER' | 'PROCESS_FRAME' | 'UPDATE_ESKF_PARAMS';
    payload?: any;
}
