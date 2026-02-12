import h5py
import json
import numpy as np

def convert(input_path, output_path):
    print(f"Converting {input_path}...")
    with h5py.File(input_path, 'r') as f:
        # 1. fs -> leaves[6].data[0]
        fs = f['Data.SamplingRate'][0]
        if hasattr(fs, 'item'): fs = fs.item()
        
        # 2. positions -> leaves[4].data -> [ [az, el, r], ... ]
        pos_raw = f['SourcePosition'][:]
        positions = pos_raw.tolist()
        
        # 3. HRIRs -> leaves[8].data -> [ [L, R], ... ]
        ir_raw = f['Data.IR'][:]
        hrirs = []
        for i in range(ir_raw.shape[0]):
            # ir_raw shape: (M, R, N) -> (M, 2, N)
            left = ir_raw[i, 0, :].tolist()
            right = ir_raw[i, 1, :].tolist()
            hrirs.append([left, right])
            
        # Construct the "leaves" array structure
        # We need indices 4, 6, 8.
        # Let's make a list of size 9 filled with empty dicts/None
        leaves = [None] * 9
        
        leaves[4] = { "data": positions }
        leaves[6] = { "data": [fs] }
        leaves[8] = { "data": hrirs }
        
        data = { "leaves": leaves }
        
        with open(output_path, 'w') as json_file:
            json.dump(data, json_file)
            
    print(f"Saved to {output_path}")

convert('public/hrtf/MIT_KEMAR_Normal.sofa', 'public/hrtf/hrtf_kemar.json')
