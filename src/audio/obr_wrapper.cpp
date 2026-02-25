#include <emscripten.h>
#include <memory>
#include <cstring>
#include "obr/renderer/obr_impl.h"
#include "obr/audio_buffer/audio_buffer.h"

static std::unique_ptr<obr::ObrImpl> global_obr;
static std::unique_ptr<obr::AudioBuffer> global_input_buffer;
static std::unique_ptr<obr::AudioBuffer> global_output_buffer;
static int g_num_channels = 0;

extern "C" {

EMSCRIPTEN_KEEPALIVE
int obr_init(int order, float sampleRate) {
    int buffer_size = 128;
    int sr = static_cast<int>(sampleRate);
    global_obr = std::make_unique<obr::ObrImpl>(buffer_size, sr);
    
    obr::AudioElementType type;
    if (order == 1) { type = obr::AudioElementType::k1OA; g_num_channels = 4; }
    else if (order == 2) { type = obr::AudioElementType::k2OA; g_num_channels = 9; }
    else if (order == 3) { type = obr::AudioElementType::k3OA; g_num_channels = 16; }
    else if (order == 4) { type = obr::AudioElementType::k4OA; g_num_channels = 25; }
    else return -1;
    
    absl::Status status = global_obr->AddAudioElement(type, obr::BinauralFilterProfile::kAmbient);
    if (!status.ok()) return -1;
    
    global_input_buffer = std::make_unique<obr::AudioBuffer>(g_num_channels, buffer_size);
    global_output_buffer = std::make_unique<obr::AudioBuffer>(2, buffer_size);
    
    return 0;
}

EMSCRIPTEN_KEEPALIVE
void obr_process(float* inPtr, float* outPtr, int frames) {
    if (!global_obr || !global_input_buffer || !global_output_buffer) return;
    
    for (int c = 0; c < g_num_channels; ++c) {
        std::memcpy(&(*global_input_buffer)[c][0], inPtr + c * frames, frames * sizeof(float));
    }
    
    global_obr->Process(*global_input_buffer, global_output_buffer.get());
    
    for (int c = 0; c < 2; ++c) {
        std::memcpy(outPtr + c * frames, &(*global_output_buffer)[c][0], frames * sizeof(float));
    }
}

EMSCRIPTEN_KEEPALIVE
void obr_set_rotation(float w, float x, float y, float z) {
    if (!global_obr) return;
    // Auto-enable head tracking on first rotation call
    global_obr->EnableHeadTracking(true);
    global_obr->SetHeadRotation(w, x, y, z);
}

EMSCRIPTEN_KEEPALIVE
void obr_enable_head_tracking(int enable) {
    if (!global_obr) return;
    global_obr->EnableHeadTracking(enable != 0);
}

EMSCRIPTEN_KEEPALIVE
void obr_load_sofa(void* ptr, int size) {
    // Basic mock implementation as in the ambi-viz repository
}

} // extern "C"
