import React from 'react';

interface HrtfSelectorProps {
    onSelect: (url: string) => void;
}

const hrtfOptions = [
    { label: 'MIT KEMAR Normal', value: '/hrtf/MIT_KEMAR_Normal.sofa' },
    { label: 'Neumann KU100 48k', value: '/hrtf/Neumann_KU100_48k.sofa' }
];

export const HrtfSelector: React.FC<HrtfSelectorProps> = ({ onSelect }) => {
    return (
        <div style={{
            margin: '20px 0',
            textAlign: 'center',
            color: '#fff'
        }}>
            <label htmlFor="hrtf-select" style={{ marginRight: '10px' }}>Select HRTF: </label>
            <select
                id="hrtf-select"
                onChange={(e) => onSelect(e.target.value)}
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
            </select>
        </div>
    );
};
