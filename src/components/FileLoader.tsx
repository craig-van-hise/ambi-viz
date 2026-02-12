import React, { useCallback } from 'react';

interface FileLoaderProps {
    onFileLoaded: (file: File) => void;
}

export const FileLoader: React.FC<FileLoaderProps> = ({ onFileLoaded }) => {
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file) {
            // Check extension
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'wav' || ext === 'ambix' || ext === 'ogg') {
                onFileLoaded(file);
            } else {
                alert('Please upload a .wav, .ambix, or .ogg file.');
            }
        }
    }, [onFileLoaded]);

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #666',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                color: '#ccc',
                cursor: 'pointer'
            }}
        >
            <p>Drag & Drop Ambisonic File Here (.wav, .ambix)</p>
        </div>
    );
};
