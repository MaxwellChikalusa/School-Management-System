import os

log_path = r'C:\Users\USER\AppData\Local\Temp\cline\large-output-1776259234355-o6mqpe5.log'
with open(log_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find login route in main.py
login_route = content.find('auth/login')
print('=== /auth/login route ===')
print(content[login_route:login_route+600])
print()

change_pw_route = content.find('auth/change-password')
print('=== /auth/change-password route ===')
print(content[change_pw_route:change_pw_route+400])
print()

# Also read App.jsx
app_jsx_path = r'c:\Users\USER\Desktop\school management system\school-management-frontend\src\App.jsx'
with open(app_jsx_path, 'r', encoding='utf-8') as f:
    print('=== App.jsx ===')
    print(f.read())

# List frontend src pages
src_path = r'c:\Users\USER\Desktop\school management system\school-management-frontend\src'
for root, dirs, files in os.walk(src_path):
    for fname in files:
        fpath = os.path.join(root, fname)
        rel = fpath.replace(src_path, '')
        print('FOUND:', rel)
