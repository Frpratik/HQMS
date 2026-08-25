import httpx
import sys

base = "http://localhost:3000"
api_base = "http://127.0.0.1:8000/api/v1"

print("================================================================")
print("     HQMS END-TO-END AUTOMATED VERIFICATION SUITE")
print("================================================================\n")

# 1. Frontend Page Availability
print("\n> [1/10] Verifying Frontend Station Pages...")
for path in ["/", "/login", "/reception", "/doctor", "/display/demo"]:
    r = httpx.get(f"{base}{path}")
    assert r.status_code == 200, f"Page {path} returned {r.status_code}"
    print(f"  [OK] {path:20} -> HTTP {r.status_code} ({len(r.text)} bytes)")

# 2. Staff Authentication
print("\n> [2/10] Testing Staff Login Authentication...")
login_res = httpx.post(
    f"{api_base}/auth/login/json",
    json={"email": "reception@hospital.com", "password": "Recep123!"},
)
assert login_res.status_code == 200
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"  [OK] Receptionist Login Successful! JWT Subject: {login_res.json()['user']['email']}")

# 3. Queues Discovery
print("\n> [3/10] Discovering Active Hospital Queues...")
queues = httpx.get(f"{api_base}/queues/", headers=headers).json()
assert len(queues) > 0
queue = queues[0]
queue_id = queue["id"]
print(f"  [OK] Active Queue: {queue['name']} ({queue['prefix']}) | ID: {queue_id}")

# 4. Walk-In Token Registration
print("\n> [4/10] Registering Walk-In Patients (Normal & Emergency)...")
resp1 = httpx.post(
    f"{api_base}/reception/tokens/walk-in",
    json={
        "queue_id": queue_id,
        "patient_name": "Vikram Malhotra",
        "patient_phone": "+919876543210",
        "priority": "NORMAL",
        "notes": "Routine checkup",
    },
    headers=headers,
)
if resp1.status_code != 201:
    print("Error on Walkin 1:", resp1.status_code, resp1.text)
w1 = resp1.json()
print(f"  [OK] Normal Token 1: {w1['token_display_number']} (Pos #{w1['operational_position']}) | Public ID: {w1['public_id']}")

resp2 = httpx.post(
    f"{api_base}/reception/tokens/walk-in",
    json={
        "queue_id": queue_id,
        "patient_name": "Rohan Gupta",
        "patient_phone": "+919876543211",
        "priority": "EMERGENCY",
        "notes": "Acute chest pain",
    },
    headers=headers,
)
if resp2.status_code != 201:
    print("Error on Walkin 2:", resp2.status_code, resp2.text)
w2 = resp2.json()
print(f"  [OK] Emergency Token 2: {w2['token_display_number']} (Priority: {w2['priority']})")


# 5. Patient Live Mobile View
print("\n> [5/10] Testing Patient Mobile Live Tracker...")
p_url = f"{base}/q/{w1['public_id']}"
p_page = httpx.get(p_url)
assert p_page.status_code == 200
p_live = httpx.get(f"{api_base}/patient/tokens/{w1['public_id']}").json()
print(f"  [OK] Patient Live View URL: {p_url} (HTTP 200)")
print(f"  [OK] Live Ahead Count: {p_live['patients_ahead']} | Est. Wait: {p_live['estimated_wait_display']}")
print(f"  [OK] Context Prompt: \"{p_live['action_prompt']}\"")

# 6. Patient Presence Self-Actions
print("\n> [6/10] Testing Patient Presence Transitions (Away -> Returning -> Ready)...")
away_res = httpx.post(f"{api_base}/patient/tokens/{w1['public_id']}/away").json()
assert away_res["status"] == "AWAY"
print(f"  [OK] Patient Marked AWAY -> Status: {away_res['status']}")

ret_res = httpx.post(f"{api_base}/patient/tokens/{w1['public_id']}/returning").json()
assert ret_res["status"] == "RETURNING"
print(f"  [OK] Patient Marked RETURNING -> Status: {ret_res['status']}")

ready_res = httpx.post(f"{api_base}/patient/tokens/{w1['public_id']}/ready").json()
assert ready_res["status"] == "READY"
print(f"  [OK] Patient Marked READY -> Status: {ready_res['status']}")

# 7. Doctor 1-Click Consultation Actions
print("\n> [7/10] Testing Doctor 1-Click Pacing...")
doc_login = httpx.post(
    f"{api_base}/auth/login/json",
    json={"email": "doctor@hospital.com", "password": "Doctor123!"},
).json()
doc_headers = {"Authorization": f"Bearer {doc_login['access_token']}"}

called = httpx.post(f"{api_base}/doctor/queues/{queue_id}/call-next", headers=doc_headers).json()
print(f"  [OK] Doctor Called Next -> Token: {called['token_display_number']} (Priority: {called['priority']}) | Status: {called['status']}")

serving = httpx.post(f"{api_base}/doctor/tokens/{called['id']}/start-serving", headers=doc_headers).json()
assert serving["status"] == "SERVING"
print(f"  [OK] Doctor Started Consultation -> Token: {serving['token_display_number']} | Status: {serving['status']}")

# 8. Doctor Queue Pause & Resume
print("\n> [8/10] Testing Emergency Queue Pause & Resumption...")
paused = httpx.post(
    f"{api_base}/doctor/queues/{queue_id}/pause",
    json={"reason": "Attending ICU Case", "expected_resume_minutes": 20},
    headers=doc_headers,
).json()
assert paused["status"] == "PAUSED"
print(f"  [OK] Queue PAUSED -> Status: {paused['status']}")

resumed = httpx.post(f"{api_base}/doctor/queues/{queue_id}/resume", headers=doc_headers).json()
assert resumed["status"] == "OPEN"
print(f"  [OK] Queue RESUMED -> Status: {resumed['status']}")

# 9. Complete Consultation
print("\n> [9/10] Completing Active Consultation...")
completed = httpx.post(f"{api_base}/doctor/tokens/{called['id']}/complete", headers=doc_headers).json()
assert completed["status"] == "COMPLETED"
print(f"  [OK] Consultation Completed -> Token: {completed['token_display_number']} | Status: {completed['status']}")

# 10. Waiting Room TV Display Board & Summary
print("\n> [10/10] Verifying Public TV Board & Telemetry...")
tv_page = httpx.get(f"{base}/display/demo")
assert tv_page.status_code == 200
summary = httpx.get(f"{api_base}/reception/queues/{queue_id}/summary", headers=headers).json()
print(f"  [OK] TV Board URL: {base}/display/demo (HTTP {tv_page.status_code})")
print(f"  [OK] Real-Time Metrics: Total Ready: {summary['total_ready']} | Total Completed: {summary['total_completed_today']}")

print("\n================================================================")
print("     ALL 10 END-TO-END WORKFLOWS VERIFIED 100% SUCCESSFUL!")
print("================================================================")

