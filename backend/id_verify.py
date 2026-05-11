from flask import Flask, request, jsonify
from flask_cors import CORS
from inference_sdk import InferenceHTTPClient
import cv2
import numpy as np
import base64
import os
import tempfile

app = Flask(__name__)
CORS(app)

API_KEY  = "9IZ9SAkpOqC2qOJUE1mN"
MODEL_ID = "id-card-0i1ip-fcs3b/1"

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)

def decode_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_bytes = base64.b64decode(base64_string)
    img_arr   = np.frombuffer(img_bytes, np.uint8)
    img       = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
    return img

def run_checks(img, temp_path):
    issues = []
    passed = []

    gray   = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── CHECK 1: Brightness ──────────────────────────────────────────────────
    brightness = gray.mean()
    if brightness < 40:
        issues.append({ "check":"LIGHTING", "status":"ERROR",
            "problem":"Room is too dark",
            "fix":"Turn on a light or move near a window" })
    elif brightness > 235:
        issues.append({ "check":"LIGHTING", "status":"WARN",
            "problem":"Too much light / overexposed",
            "fix":"Move away from direct sunlight" })
    else:
        passed.append({ "check":"LIGHTING", "status":"PASS",
            "value":f"brightness={brightness:.0f}" })

    # ── CHECK 2: Blur ────────────────────────────────────────────────────────
    blur = cv2.Laplacian(gray, cv2.CV_64F).var()
    if blur < 40:          # ← was 80, now 40 — webcams score 40–120 normally
        issues.append({ "check":"SHARPNESS", "status":"ERROR",
            "problem":f"Image is blurry (score={blur:.0f})",
            "fix":"Clean your camera lens or hold still" })
    else:
        passed.append({ "check":"SHARPNESS", "status":"PASS",
            "value":f"blur_score={blur:.0f}" })

    # ── CHECK 3: Face Detection ──────────────────────────────────────────────
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    faces      = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
    face_count = len(faces)

    if face_count == 0:
        issues.append({ "check":"FACE", "status":"ERROR",
            "problem":"No face detected",
            "fix":"Face check happens in next step — continue if ID is visible" })
    elif face_count > 1:
        issues.append({ "check":"FACE", "status":"WARN",
            "problem":f"{face_count} faces detected",
            "fix":"Only you should be visible" })
    else:
        passed.append({ "check":"FACE", "status":"PASS",
            "value":"1 face detected" })

    # ── CHECK 4: ID Card via Roboflow ────────────────────────────────────────
    try:
        rf_result = CLIENT.infer(temp_path, model_id=MODEL_ID)
        preds     = rf_result.get("predictions", [])
        print(f"[Roboflow] predictions={preds}")

        # Classify each prediction
        VALID_CLASSES   = {'1-id', '2-id', '3-id', '4-id', 'id card',
                           'id-card', 'card', 'id', '1-ID', '2-ID',
                           '3-ID', '4-ID'}
        MISSING_CLASSES = {'id missing', 'id covered', 'missing', 'covered'}

        best_valid   = None
        best_missing = None

        for p in preds:
            cls  = p['class'].lower().strip()
            conf = p['confidence']
            # check valid
            if p['class'] in VALID_CLASSES or any(v in cls for v in
                    {'1-id','2-id','3-id','4-id','id card','id-card','card'}):
                if best_valid is None or conf > best_valid['confidence']:
                    best_valid = p
            # check missing/covered
            elif any(m in cls for m in MISSING_CLASSES):
                if best_missing is None or conf > best_missing['confidence']:
                    best_missing = p

        if best_valid and best_valid['confidence'] >= 0.35:
            # Clear valid detection
            passed.append({ "check":"ID_CARD — Roboflow YOLOv11",
                "status":"PASS",
                "value":f"{best_valid['class']} | confidence={best_valid['confidence']:.0%}" })

        elif best_missing and best_missing['confidence'] >= 0.80 and best_valid is None:
            # Strong missing signal with no valid card found
            issues.append({ "check":"ID_CARD — Roboflow YOLOv11", "status":"WARN",
                "problem":"Hold ID flat, face-up, fill the frame",
                "fix":"Hold your college/government ID clearly visible" })

        elif preds:
            # Predictions exist but mixed/weak — treat as WARN not ERROR
            top = max(preds, key=lambda p: p['confidence'])
            issues.append({ "check":"ID_CARD — Roboflow YOLOv11", "status":"WARN",
                "problem":f"Card region found ({top['class']} {top['confidence']:.0%}) — adjust angle",
                "fix":"Hold ID flat, face-forward, fill more of the frame" })

        else:
            # No predictions at all
            issues.append({ "check":"ID_CARD — Roboflow YOLOv11", "status":"WARN",
                "problem":"No card detected in frame",
                "fix":"Hold ID inside the guide box, fill at least 40% of frame" })

    except Exception as e:
        print(f"[Roboflow ERROR] {e}")
        issues.append({ "check":"ID_CARD", "status":"WARN",
            "problem":f"Verification service error: {str(e)[:60]}",
            "fix":"Try again in a moment" })

    # ── Overall: fail only on ERROR (not WARN) ───────────────────────────────
    # Also ignore FACE errors here — face is verified in phase 2
    errors  = [x for x in issues
               if x["status"] == "ERROR" and x["check"] != "FACE"]
    overall = len(errors) == 0 and len(passed) > 0

    return { "passed": passed, "issues": issues, "overall": overall }


@app.route('/verify-id', methods=['POST'])
def verify_id():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image provided"}), 400

        img = decode_image(data['image'])
        if img is None:
            return jsonify({"error": "Could not decode image"}), 400

        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            temp_path = tmp.name
            cv2.imwrite(temp_path, img)

        result = run_checks(img, temp_path)

        try: os.unlink(temp_path)
        except: pass

        return jsonify(result)

    except Exception as e:
        print(f"[verify-id ERROR] {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": MODEL_ID})


if __name__ == '__main__':
    print("✅ ID Verification API running on http://localhost:5001")
    print(f"   Model: {MODEL_ID}")
    app.run(port=5001, debug=True)