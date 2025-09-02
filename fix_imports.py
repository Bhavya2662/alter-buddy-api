#!/usr/bin/env python3
import os
import re

def fix_imports_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix controller imports (from src/api/1.0/controller to src/interface, model, utils, etc.)
    if '/api/1.0/controller/' in filepath:
        content = re.sub(r'from "../../../../interface"', 'from "../../../interface"', content)
        content = re.sub(r'from "../../../../model"', 'from "../../../model"', content)
        content = re.sub(r'from "../../../../utils"', 'from "../../../utils"', content)
        content = re.sub(r'from "../../../../middleware"', 'from "../../../middleware"', content)
        content = re.sub(r'from "../../../../validation"', 'from "../../../validation"', content)
        content = re.sub(r'from "services/', 'from "../../../services/', content)
        content = re.sub(r'from "middleware"', 'from "../../../middleware"', content)
        content = re.sub(r'from "validation"', 'from "../../../validation"', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

# Fix all TypeScript files in controller directory
controller_dir = 'src/api/1.0/controller'
for filename in os.listdir(controller_dir):
    if filename.endswith('.ts'):
        filepath = os.path.join(controller_dir, filename)
        fix_imports_in_file(filepath)
        print(f'Fixed imports in {filepath}')

print('All imports fixed!')