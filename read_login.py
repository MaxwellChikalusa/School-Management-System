import os

files = [
    r'c:\Users\USER\Desktop\school management system\school-management-frontend\src\pages\Login.jsx',
    r'c:\Users\USER\Desktop\school management system\school-management-frontend\src\context\AuthContext.jsx',
    r'c:\Users\USER\Desktop\school management system\school-management-frontend\src\pages\Signup.jsx',
]
for path in files:
    print('=== FILE:', os.path.basename(path), '===')
    with open(path, 'r', encoding='utf-8') as f:
        print(f.read())
    print()
