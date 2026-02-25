import React, { useCallback } from 'react';

const SUPPORTED_EXTENSIONS = ['wav', 'ambix', 'ogg', 'iamf'];

interface FileLoaderProps {
    onFilesQueued: (files: File[]) => void;
}

/**
 * Recursively reads a FileSystemDirectoryEntry and returns all supported audio files.
 */
function readDirectoryRecursive(entry: FileSystemDirectoryEntry): Promise<File[]> {
    return new Promise((resolve) => {
        const reader = entry.createReader();
        const allFiles: File[] = [];

        const readBatch = () => {
            reader.readEntries(async (entries) => {
                if (entries.length === 0) {
                    resolve(allFiles);
                    return;
                }
                for (const e of entries) {
                    if (e.isFile) {
                        const file = await new Promise<File>((res) =>
                            (e as FileSystemFileEntry).file(res)
                        );
                        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                        if (SUPPORTED_EXTENSIONS.includes(ext)) {
                            allFiles.push(file);
                        }
                    } else if (e.isDirectory) {
                        const subFiles = await readDirectoryRecursive(e as FileSystemDirectoryEntry);
                        allFiles.push(...subFiles);
                    }
                }
                // readEntries may return batches; keep reading
                readBatch();
            });
        };
        readBatch();
    });
}

export const FileLoader: React.FC<FileLoaderProps> = ({ onFilesQueued }) => {
    const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const items = e.dataTransfer.items;
        const collected: File[] = [];

        if (items && items.length > 0) {
            // Try directory-aware API first
            const entries: FileSystemEntry[] = [];
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry?.();
                if (entry) entries.push(entry);
            }

            if (entries.length > 0) {
                for (const entry of entries) {
                    if (entry.isDirectory) {
                        const files = await readDirectoryRecursive(entry as FileSystemDirectoryEntry);
                        collected.push(...files);
                    } else if (entry.isFile) {
                        const file = await new Promise<File>((res) =>
                            (entry as FileSystemFileEntry).file(res)
                        );
                        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                        if (SUPPORTED_EXTENSIONS.includes(ext)) {
                            collected.push(file);
                        }
                    }
                }
            }
        }

        // Fallback: plain file list (no directory support)
        if (collected.length === 0) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    collected.push(file);
                }
            }
        }

        if (collected.length > 0) {
            // Sort alphabetically for consistent queue ordering
            collected.sort((a, b) => a.name.localeCompare(b.name));
            onFilesQueued(collected);
        } else {
            alert('No supported audio files found (.wav, .ambix, .ogg, .iamf)');
        }
    }, [onFilesQueued]);

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="file-loader-drop"
        >
            <p>Drop Audio Files or Folders Here</p>
            <p style={{ fontSize: '0.75em', opacity: 0.5 }}>.wav · .ambix · .ogg · .iamf</p>
        </div>
    );
};
