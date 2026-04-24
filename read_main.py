import os

# Read main.py to find the login route
main_path = r'c:\Users\USER\Desktop\school management system\school-management-backend\main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find auth routes
idx = content.find('auth/login')
print('=== auth/login area ===')
print(content[max(0,idx-50):idx+500])
print()

idx2 = content.find('auth/change-password')
print('=== auth/change-password area ===')
print(content[max(0,idx2-50):idx2+400])
print()

# Read database.py fully
db_path = r'c:\Users\USER\Desktop\school management system\school-management-backend\database.py'
with open(db_path, 'r', encoding='utf-8') as f:
    print('=== database.py FULL ===')
    print(f.read())

# Read App.jsx
app_path = r'c:\Users\USER\Desktop\school management system\school-management-frontend\src\App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    print('=== App.jsx ===')
    print(f.read())

# List src pages
src_path = r'c:\Users\USER\Desktop\school management system\school-management-frontend\src'
print('=== Frontend src files ===')
for root, dirs, files in os.walk(src_path):
    for fname in files:
        fpath = os.path.join(root, fname)
        print(fpath.replace(src_path, ''))
