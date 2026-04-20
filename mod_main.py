with open('backend/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'def serve_admin_dashboard():' in line:
        new_lines.append(line)
        new_lines.append('    from fastapi.responses import HTMLResponse\n')
        new_lines.append('    return HTMLResponse("<html><body style=\'font-family:sans-serif; text-align:center; padding-top: 50px; background:#fdf8f3;\'><h1>Krishi-Drishti Admin Dashboard</h1><p>The Ops Admin Dashboard has been upgraded and moved to the primary modern React Frontend.</p><p>Please navigate to <b>http://localhost:3000</b> and click the lock icon in the top right to access the secure telemetry dashboard.</p></body></html>")\n')
        skip = True
    elif skip and line.strip() == '':
        skip = False
        new_lines.append(line)
    elif not skip:
        new_lines.append(line)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
