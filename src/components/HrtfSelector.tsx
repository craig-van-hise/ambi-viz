import React, { useRef } from 'react';

interface HrtfSelectorProps {
    onSelect: (value: string | File) => void;
    currentValue: string;
}

const hrtfOptions = [
    { label: 'MIT KEMAR Normal', value: `${import.meta.env.BASE_URL}hrtf/MIT_KEMAR_Normal.sofa` },
    { label: 'Neumann KU100 48k', value: `${import.meta.env.BASE_URL}hrtf/Neumann_KU100_48k.sofa` }
];

export const HrtfSelector: React.FC<HrtfSelectorProps> = ({ onSelect, currentValue }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isBuiltIn = hrtfOptions.some(opt => opt.value === currentValue);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSelect(file);
        }
    };

    return (
        <div style={{
            margin: '20px 0',
            textAlign: 'center',
            color: '#fff'
        }}>
            <label htmlFor="hrtf-select" style={{ marginRight: '10px' }}>Select HRTF: </label>
            <select
                id="hrtf-select"
                value={isBuiltIn ? currentValue : 'custom'}
                onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'upload') {
                        fileInputRef.current?.click();
                    } else if (value !== 'custom') {
                        onSelect(value);
                    }
                }}
                style={{
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    outline: 'none'
                }}
            >
                {hrtfOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
                {!isBuiltIn && (
                    <option value="custom">{currentValue}</option>
                )}
                <option value="upload">Upload Custom...</option>
            </select>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".sofa"
                onChange={handleFileChange}
            />
        </div>
    );
};
