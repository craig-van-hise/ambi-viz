
#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>
#include <memory>
#include <vector>

#include "obr/renderer/obr_impl.h"
#include "obr/renderer/audio_element_type.h"
#include "obr/audio_buffer/audio_buffer.h"

static std::unique_ptr<obr::ObrImpl> g_renderer = nullptr;
static int g_order = 1;

extern "C" {

EMSCRIPTEN_KEEPALIVE
void* _obr_init(int order, float sampleRate) {
    g_order = order;
    // OBR typically uses a fixed buffer size for internal FFTs, 128 is standard for AudioWorklet.
    g_renderer = std::make_unique<obr::ObrImpl>(128, static_cast<int>(sampleRate));
    
    obr::AudioElementType type;
    switch (order) {
        case 1: type = obr::AudioElementType::k1OA; break;
        case 2: type = obr::AudioElementType::k2OA; break;
        case 3: type = obr::AudioElementType::k3OA; break;
        case 4: type = obr::AudioElementType::k4OA; break;
        default: type = obr::AudioElementType::k1OA; break;
    }
    
    auto status = g_renderer->AddAudioElement(type);
    if (!status.ok()) {
        std::cerr << "OBR Wrapper: Failed to add audio element: " << status.message() << std::endl;
        return nullptr;
    }
    
    std::cout << "OBR Wrapper: Initialized OBR for Order " << order << " at " << sampleRate << "Hz" << std::endl;
    return g_renderer.get();
}

EMSCRIPTEN_KEEPALIVE
void _obr_process(float* in_ptr, float* out_ptr, int frames) {
    if (!g_renderer) return;
    
    size_t num_input_channels = g_renderer->GetNumberOfInputChannels();
    size_t num_output_channels = g_renderer->GetNumberOfOutputChannels();
    
    // Create AudioBuffer wrappers for the raw pointers.
    // OBR expects planar data.
    obr::AudioBuffer input_buffer(num_input_channels, frames);
    for (size_t i = 0; i < num_input_channels; ++i) {
        // Copy data into planar buffer if not already planar.
        // Assuming the input is already planar (which is standard for AudioWorklet inputs).
        std::copy(in_ptr + (i * frames), in_ptr + ((i + 1) * frames), input_buffer[i].begin());
    }
    
    obr::AudioBuffer output_buffer(num_output_channels, frames);
    
    g_renderer->Process(input_buffer, &output_buffer);
    
    // Copy back to out_ptr.
    for (size_t i = 0; i < num_output_channels; ++i) {
        std::copy(output_buffer[i].begin(), output_buffer[i].end(), out_ptr + (i * frames));
    }
}

EMSCRIPTEN_KEEPALIVE
void _obr_load_sofa(void* ptr, int size) {
    if (!g_renderer) return;
    
    // NOTE: Native SOFA parsing is complex and requires HDF5/NetCDF.
    // For this implementation, we log the attempt. 
    // The OBR engine currently uses its internal baked-in HRTF assets.
    std::cout << "OBR Wrapper: load_sofa called with " << size << " bytes." << std::endl;
    std::cerr << "OBR Wrapper: Native SOFA parsing is not yet implemented. Using default HRIRs." << std::endl;
    
    // In a production scenario, you would use a library like libmysofa here.
    // Since OBR doesn't expose a direct way to set the HRIR AudioBuffer yet, 
    // we would need to add a method to ObrImpl or call the internal decoder.
}

} // extern "C"
