import requests
import json
import time

res = requests.post("http://localhost:8000/api/sse_analysis/analyze-plot?token=kd_admin_KrishiDrishti2026", json={"plot_id": 1})
print("Start:", res.status_code, res.text)
if res.status_code == 200:
    job_id = res.json().get("task_id")
    for _ in range(10):
        time.sleep(2)
        r2 = requests.get(f"http://localhost:8000/api/sse_analysis/task-status/{job_id}?token=kd_admin_KrishiDrishti2026")
        print("Poll:", r2.text)
        if "success" in r2.text or "failed" in r2.text:
            break
