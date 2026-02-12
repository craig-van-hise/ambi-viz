import h5py
import numpy as np

def inspect_sofa(path):
    try:
        with h5py.File(path, 'r') as f:
            print(f"Keys: {list(f.keys())}")
            if 'Data.IR' in f:
                print(f"Data.IR shape: {f['Data.IR'].shape}")
            elif 'Data.IR' in f['Data']: # Sometimes nested?
                print("Data.IR is in Data group")
            
            if 'SourcePosition' in f:
                print(f"SourcePosition shape: {f['SourcePosition'].shape}")
            
            if 'Data.SamplingRate' in f:
                print(f"SampleRate via key: {f['Data.SamplingRate'][0]}")
            
            # DFS for relevant keys if structure differs
            def log_keys(name, node):
                if isinstance(node, h5py.Dataset):
                    print(f"{name}: {node.shape} {node.dtype}")
            
            # f.visititems(log_keys) # Too verbose?
    except Exception as e:
        print(f"Error: {e}")

inspect_sofa('public/hrtf/MIT_KEMAR_Normal.sofa')
