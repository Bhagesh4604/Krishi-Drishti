import h5py
import json
import sys

def patch_h5(filepath):
    print(f"Patching HDF5 file: {filepath}")
    with h5py.File(filepath, 'r+') as f:
        model_config = f.attrs.get('model_config')
        if model_config is None:
            print("No model_config found!")
            return
            
        if isinstance(model_config, bytes):
            config_str = model_config.decode('utf-8')
        else:
            config_str = model_config
            
        config = json.loads(config_str)
        
        def scrub_kwargs(d):
            if isinstance(d, dict):
                d.pop('batch_shape', None)
                d.pop('optional', None)
                for k, v in d.items():
                    scrub_kwargs(v)
            elif isinstance(d, list):
                for item in d:
                    scrub_kwargs(item)
                    
        scrub_kwargs(config)
        
        new_config_str = json.dumps(config)
        f.attrs['model_config'] = new_config_str.encode('utf-8')
        print("Successfully patched model_config!")

if __name__ == "__main__":
    patch_h5(sys.argv[1])
