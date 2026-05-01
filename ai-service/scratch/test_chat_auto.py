# Auto Test Script for Interactive Chat Strategy (Fixed Encoding)
import requests
import json
import time
import sys
import uuid

# Ensure UTF-8 for printing
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8080/api"
BRAND_ID = "30c36e9f-5109-4e0b-ad2e-cee199e15c56"
USER_ID = "b6ac6160-444f-452a-b25f-d7b17b452b7f" # Valid UUID format
SESSION_ID = str(uuid.uuid4())

def send_chat(message: str):
    print(f"\n[USER]: {message}")
    payload = {
        "brand_id": BRAND_ID,
        "user_id": USER_ID,
        "session_id": SESSION_ID,
        "message": message,
        "provider": "openrouter"
    }
    try:
        res = requests.post(f"{BASE_URL}/chat/send", json=payload)
        if res.status_code == 200:
            data = res.json()
            print(f"[AI]:\n{data['answer']}\n")
            if data.get("saved_entities"):
                print(f"[AUTO-SAVE]: Created entities: {data['saved_entities']}\n")
            return data
        else:
            print(f"Error: {res.text}")
            return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

if __name__ == "__main__":
    print(f"--- REFINED PIPELINE TEST (Clarification -> Plan -> Image Gen -> Save) ---")
    
    # Step 1: Initial Request (AI should ask for details: Goal, Tone, Count, Length, Images)
    send_chat("Tôi muốn tạo campaign SocialFlow tặng Ebook 'Marketing Automation 2025' cho Digital Marketers.")
    
    time.sleep(2)
    
    # Step 2: Provide missing details (Goal, Tone, Platforms, Count, Length, AND confirm Images)
    # AI should now propose a plan because it has all info.
    send_chat("Mục tiêu: 500 lead. Tone: Chuyên nghiệp. Thời gian: 2 tuần. Nền tảng: LinkedIn. Số lượng: 3 bài. Độ dài: Trung bình. CÓ TẠO HÌNH ẢNH cho mỗi bài.")
    
    time.sleep(4)
    
    # Step 3: Confirm the plan to trigger Execution + Auto-Image-Gen + DB Save
    send_chat("Kế hoạch này hoàn hảo. Hãy TIẾN HÀNH tạo nội dung và sinh ảnh luôn cho tôi.")
