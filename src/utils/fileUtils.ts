export const SUPPORTED_EXTENSIONS = ['wav', 'ambix', 'ogg', 'iamf', 'opus'];

export function isSupportedAudioFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
        return true;
    }
    if (file.type === 'audio/opus') {
        return true;
    }
    return false;
}
