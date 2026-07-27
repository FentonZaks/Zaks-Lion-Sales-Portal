import os
import re

src_dir = r'C:\Users\Bryan\Zaks Foods LLC\ZAKS SALES PORTAL\portal-app\src'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            content = re.sub(r'import\s+React\s+from\s+[\'"]react[\'"];?\s*', '', content)
            content = re.sub(r'import\s+React\s*,\s*\{\s*(.*?)\s*\}\s*from\s+[\'"]react[\'"];?', r'import { \1 } from \'react\';', content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

print('Cleaned React imports.')
