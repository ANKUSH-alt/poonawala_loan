"""
Poonawalla Fincorp – AI Loan Wizard Backend
Flask + MongoDB + Google Gemini AI
"""

import sys
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
import google.generativeai as genai
import json
import random
import string
import hashlib
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

# ─── CONFIG ──────────────────────────────────────────────────────────────────
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

# Configure AI (Lazy initialization)
def get_ai_model():
    if not GEMINI_API_KEY:
        return None
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        return genai.GenerativeModel('gemini-1.5-flash')
    except:
        return None

app = Flask(__name__)
CORS(app)

# Path to the root directory where index.html and other static files reside
# Since this file is now in api/index.py, the root is one level up
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# ─── DATABASE INIT ───────────────────────────────────────────────────────────
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
    db = client.get_database("poonawalla_loan_db")
    print(f"✅ Securely connected to MongoDB")
except Exception as e:
    print(f"❌ Connection error: {e}")
    db = None

def init_db():
    if db is None: return
    
    # Always ensure policy config is present
    if db.policy_config.count_documents({}) == 0:
        default_policies = [
            {'key': 'min_age', 'value': '21'}, {'key': 'max_age', 'value': '65'},
            {'key': 'min_cibil', 'value': '650'}, {'key': 'min_income', 'value': '25000'},
            {'key': 'max_dti', 'value': '50'}, {'key': 'min_loan', 'value': '100000'},
            {'key': 'max_loan', 'value': '5000000'}, {'key': 'min_tenure', 'value': '12'},
            {'key': 'max_tenure', 'value': '84'}, {'key': 'rate_aplus', 'value': '10.5'},
            {'key': 'rate_a', 'value': '11.5'}, {'key': 'rate_bplus', 'value': '13.0'},
            {'key': 'rate_b', 'value': '15.0'}, {'key': 'geo_tolerance_km', 'value': '50'},
            {'key': 'age_variance', 'value': '5'}, {'key': 'stt_min_score', 'value': '0.75'},
            {'key': 'liveness_min', 'value': '0.90'}
        ]
        db.policy_config.insert_many(default_policies)
    
    # ONLY clear data if specifically requested or if it's a fresh local install
    # On Vercel/Production, we should NOT wipe the DB on every import
    if os.getenv("SEED_DB") == "true":
        print("🧹 Cleaning raw data and setting up Admin user...")
        db.applications.delete_many({})
        db.audit_logs.delete_many({})
        db.consents.delete_many({})
        db.video_sessions.delete_many({})
        db.users.delete_many({})
        
        # Seed default admin
        db.users.insert_one({
            'username': 'admin@poonawalla.com',
            'password': 'Poonawalla@2025',
            'role': 'admin',
            'full_name': 'System Administrator'
        })
        seed_demo_data()
    else:
        # Ensure at least one admin exists if not already present
        if db.users.count_documents({'role': 'admin'}) == 0:
            db.users.insert_one({
                'username': 'admin@poonawalla.com',
                'password': 'Poonawalla@2025',
                'role': 'admin',
                'full_name': 'System Administrator'
            })

def seed_demo_data():
    """Use Gemini to seed one realistic Admin application instead of raw hardcoded lists"""
    print("🤖 AI is generating a realistic Admin application...")
    
    prompt = """
    Generate a JSON for ONE realistic Indian loan application for 'Ankush Gupta'.
    - full_name: 'Ankush Gupta'
    - emp_type: 'salaried'
    - monthly_income: 185000
    - loan_purpose: 'home_renovation'
    - loan_required: 1500000
    - city: 'Mumbai'
    - pan: 'AKGPD1234F'
    - mobile: '9876543210'
    - risk_band: 'A+'
    - cibil_score: 835
    - status: 'Approved'
    - ai_insight: 'Strategic lead with impeccable credit history and high stable income.'
    
    Return ONLY the JSON object.
    """

    try:
        ai_model = get_ai_model()
        if not ai_model: raise Exception("AI Model not available")
        response = ai_model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        app_data = json.loads(response.text)
        
        app_num = 'PF10000000'
        session_id = 'ADMIN_SESSION'
        ts = datetime.now()
        
        app_data.update({
            'app_num': app_num,
            'session_id': session_id,
            'created_at': ts,
            'updated_at': ts,
            'offer_amount': app_data['loan_required'],
            'offer_rate': 10.5,
            'offer_tenure': 36,
            'offer_emi': calc_emi(app_data['loan_required'], 36, 10.5)
        })
        
        db.applications.insert_one(app_data)
        
        # Generate audit logs for this one app
        events = [
            ('KYC', 'Personal details submitted'),
            ('Consent', 'Consent forms digitally signed'),
            ('KYC', 'Video KYC session completed'),
            ('Analysis', 'AI Risk Assessment complete: Band A+')
        ]
        for j, (event_type, detail) in enumerate(events):
            ev_ts = ts + timedelta(minutes=j*10)
            ev_hash = hashlib.sha256(f'{app_num}{detail}{ev_ts}'.encode()).hexdigest()[:12].upper()
            db.audit_logs.insert_one({
                'session_id': session_id, 'app_num': app_num, 'event_type': event_type,
                'event_detail': detail, 'actor': 'System', 'ip_address': '127.0.0.1',
                'status': 'Logged', 'event_hash': ev_hash, 'created_at': ev_ts
            })
            
        print("✅ Successfully seeded Admin application.")
    except Exception as e:
        print(f"❌ Failed to generate AI seed data: {e}")
        db.applications.insert_one({
            'app_num': 'PF10000000', 'session_id': 'ADMIN_SESSION', 'full_name': 'Admin User',
            'mobile': '9876543210', 'pan': 'ABCDE1234F', 'monthly_income': 150000,
            'loan_required': 1000000, 'status': 'Approved', 'created_at': datetime.now(),
            'risk_band': 'A+', 'cibil_score': 820
        })

def calc_emi(principal, months, rate_pa):
    r = rate_pa / 100 / 12
    if r == 0: return round(principal / months)
    emi = principal * r * (1 + r)**months / ((1 + r)**months - 1)
    return round(emi)

def make_app_num():
    return 'PF' + ''.join(random.choices(string.digits, k=8))

def log_event(session_id, app_num, event_type, detail, actor='System', ip='0.0.0.0'):
    ev_hash = hashlib.sha256(f'{session_id}{detail}{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()
    db.audit_logs.insert_one({
        'session_id': session_id, 'app_num': app_num, 'event_type': event_type,
        'event_detail': detail, 'actor': actor, 'ip_address': ip, 'status': 'Logged',
        'event_hash': ev_hash, 'created_at': datetime.now()
    })

# ─── STATIC FILE SERVING ─────────────────────────────────────────────────────
@app.route('/')
def serve_index(): return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    full = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(full): return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')

# ─── API: HEALTH CHECK ───────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    db_status = False
    db_err = None
    if db is not None:
        try:
            db.users.count_documents({})
            db_status = True
        except Exception as e:
            db_err = str(e)
            
    return jsonify({
        'status': 'ok',
        'db_connected': db_status,
        'db_error': db_err,
        'ai_configured': bool(GEMINI_API_KEY)
    })

# ─── API: AUTHENTICATION ───────────────────────────────────────────────────
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    if db is None:
        return jsonify({'success': False, 'message': 'Database connection error. Please check MONGODB_URI.'}), 503
        
    try:
        user = db.users.find_one({'username': username, 'password': password})
        if not user:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        return jsonify({
            'success': True,
            'user': {
                'username': user['username'],
                'role': user['role'],
                'full_name': user.get('full_name', 'User')
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'DB Error: {str(e)}'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    if db is None:
        return jsonify({'success': False, 'message': 'Database connection error'}), 503
        
    if db.users.find_one({'username': data['username']}):
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    
    data['role'] = 'user' # Direct registration is always 'user'
    db.users.insert_one(data)
    return jsonify({'success': True})

# ─── API: SESSIONS ────────────────────────────────────────────────────────────
@app.route('/api/session/create', methods=['POST'])
def create_session():
    data = request.json or {}
    session_id = data.get('session_id', str(uuid.uuid4())[:8].upper())
    return jsonify({'success': True, 'session_id': session_id})

# ─── API: SUBMIT DETAILS ─────────────────────────────────────────────────────
@app.route('/api/application/details', methods=['POST'])
def save_details():
    data = request.json
    if not data: return jsonify({'error': 'No data'}), 400
    app_data = {
        'full_name': data['full_name'], 'mobile': data['mobile'], 'dob': data['dob'],
        'pan': data['pan'].upper(), 'emp_type': data['emp_type'],
        'monthly_income': float(data['monthly_income']), 'loan_purpose': data['loan_purpose'],
        'loan_required': float(data['loan_required']), 'city': data.get('city',''),
        'geo_lat': data.get('geo_lat'), 'geo_lon': data.get('geo_lon'),
        'username': data.get('username'), # Link to user if logged in
        'updated_at': datetime.now()
    }
    result = db.applications.update_one({'session_id': data['session_id']}, {'$set': app_data}, upsert=True)
    if result.upserted_id:
        app_num = make_app_num()
        db.applications.update_one({'_id': result.upserted_id}, {'$set': {'app_num': app_num, 'created_at': datetime.now()}})
        log_event(data['session_id'], app_num, 'KYC', 'Personal details submitted', data['full_name'], request.remote_addr)
    return jsonify({'success': True, 'session_id': data['session_id']})

@app.route('/api/application/consents', methods=['POST'])
def save_consents():
    data = request.json or {}
    db.consents.update_one({'session_id': data['session_id']}, {'$set': data}, upsert=True)
    return jsonify({'success': True})

@app.route('/api/session/video', methods=['POST'])
def save_video_session():
    data = request.json or {}
    db.video_sessions.update_one({'session_id': data['session_id']}, {'$set': data}, upsert=True)
    return jsonify({'success': True})

# ─── API: RUN REAL AI ANALYSIS (GEMINI) ──────────────────────────────────────
@app.route('/api/application/analyze', methods=['POST'])
def run_analysis():
    data = request.json or {}
    session_id = data.get('session_id')
    if not session_id: return jsonify({'error': 'Missing session_id'}), 400

    app_row = db.applications.find_one({'session_id': session_id})
    if not app_row: return jsonify({'error': 'Application not found'}), 404

    # 1. Prepare Prompt for Gemini
    prompt = f"""
    Internal Banking Risk Assessment for Poonawalla Fincorp.
    Applicant Details:
    - Name: {app_row['full_name']}
    - Income: ₹{app_row['monthly_income']}/month
    - Employment: {app_row['emp_type']}
    - Pan: {app_row['pan']}
    - Loan Purpose: {app_row['loan_purpose']}
    - Requested Amount: ₹{app_row['loan_required']}

    Analyze the credit risk and provide the response in EXACTLY this JSON format:
    {{
      "risk_band": "A+" | "A" | "B+" | "B",
      "cibil_score": integer between 650-850,
      "ai_insight": "A professional 2-sentence summary of why this risk band was chosen and the borrower's persona.",
      "confidence_score": decimal between 0.9 and 1.0,
      "age_estimation": integer between 25 and 55,
      "status_recommendation": "Approved" | "Rejected"
    }}
    Base the CIBIL score logically on income and employment stability. Risk band A+ is for high income/stable jobs.
    """

    try:
        # 2. Call Gemini
        ai_model = get_ai_model()
        if not ai_model:
            return jsonify({'error': 'AI configuration missing (GEMINI_API_KEY)'}), 500
            
        response = ai_model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        ai_result = json.loads(response.text)
        
        # 3. Handle specific logic (override if policy says so)
        risk_band = ai_result.get('risk_band', 'A')
        cibil = ai_result.get('cibil_score', 750)
        status = ai_result.get('status_recommendation', 'Approved')

        db.applications.update_one(
            {'session_id': session_id},
            {'$set': {
                'cibil_score': cibil, 'risk_band': risk_band, 
                'ai_insight': ai_result.get('ai_insight', ""),
                'ai_confidence': ai_result.get('confidence_score', 0.95),
                'age_estimated': ai_result.get('age_estimation', 32),
                'status': status, 'updated_at': datetime.now()
            }}
        )

        log_event(session_id, app_row['app_num'], 'Analysis', 
                  f'Gemini AI analysis complete: Band {risk_band}, CIBIL {cibil}', 'AI Engine', request.remote_addr)

        return jsonify({
            'success': True, 'session_id': session_id, 'app_num': app_row['app_num'],
            'risk_band': risk_band, 'cibil_score': cibil, 'status': status,
            'full_name': app_row['full_name'], 'ai_insight': ai_result.get('ai_insight')
        })
    except Exception as e:
        print(f"❌ Gemini API Error: {e}")
        # Fallback to logic-based simulation if API fails
        return jsonify({'error': 'AI Assessment failed', 'details': str(e)}), 500

# ─── API: OFFERS ─────────────────────────────────────────────────────────────
@app.route('/api/application/offers/<session_id>', methods=['GET'])
def get_offers(session_id):
    app_row = db.applications.find_one({'session_id': session_id})
    if not app_row: return jsonify({'error': 'Session not found'}), 404

    risk_band = app_row.get('risk_band', 'A')
    policies = {p['key']: p['value'] for p in db.policy_config.find()}
    base_rate = float(policies.get(f'rate_{risk_band.lower().replace("+", "plus")}', 12.5))
    
    offers = [
        {
            'id': 'offer-1', 'name': 'Conservative Plan', 'amount': int(app_row['loan_required'] * 0.7),
            'tenure': 24, 'rate': base_rate, 'emi': calc_emi(int(app_row['loan_required'] * 0.7), 24, base_rate),
            'recommended': False, 'perks': ['No foreclosure fee', 'Priority support']
        },
        {
            'id': 'offer-2', 'name': 'Recommended Plan ⭐', 'amount': int(app_row['loan_required']),
            'tenure': 36, 'rate': base_rate, 'emi': calc_emi(int(app_row['loan_required']), 36, base_rate),
            'recommended': True, 'perks': ['Best rate', 'Zero processing fee', 'Pre-approved']
        }
    ]
    return jsonify({
        'success': True, 'session_id': session_id, 'app_num': app_row['app_num'],
        'full_name': app_row['full_name'], 'risk_band': risk_band,
        'cibil_score': app_row['cibil_score'], 'ai_insight': app_row.get('ai_insight', ""),
        'offers': offers
    })

# ─── API: ACCEPT OFFER ────────────────────────────────────────────────────────
@app.route('/api/application/accept', methods=['POST'])
def accept_offer():
    data = request.json or {}
    db.applications.update_one({'session_id': data['session_id']}, {'$set': {'status': 'Approved', 'updated_at': datetime.now()}})
    return jsonify({'success': True})

# ─── API: DASHBOARD ──────────────────────────────────────────────────────────
@app.route('/api/dashboard/overview', methods=['GET'])
def dashboard_overview():
    total = db.applications.count_documents({})
    approved_docs = list(db.applications.find({'status': 'Approved'}))
    total_disbursed = sum(doc.get('offer_amount', 0) or 0 for doc in approved_docs)
    
    # Calculate risk distribution
    risk_dist = {}
    for rb in ['A+', 'A', 'B+', 'B']:
        risk_dist[rb] = db.applications.count_documents({'risk_band': rb})
    
    # Simple volume chart (last 7 days counts)
    volume_chart = []
    now = datetime.now()
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.applications.count_documents({'created_at': {'$gte': day_start, '$lt': day_end}})
        appr = db.applications.count_documents({'created_at': {'$gte': day_start, '$lt': day_end}, 'status': 'Approved'})
        volume_chart.append({'day': day_start.strftime('%a'), 'total': count, 'approved': appr})

    return jsonify({
        'success': True, 
        'total_applications': total, 
        'approved': len(approved_docs),
        'total_disbursed': total_disbursed, 
        'fraud_flags': db.applications.count_documents({'fraud_flag': True}), 
        'volume_chart': volume_chart, 
        'risk_distribution': risk_dist
    })

@app.route('/api/dashboard/applications', methods=['GET'])
def get_applications():
    apps = list(db.applications.find().sort('created_at', -1).limit(100))
    for a in apps: a['_id'] = str(a['_id'])
    return jsonify({'success': True, 'applications': apps, 'count': len(apps)})

@app.route('/api/my-applications/<username>', methods=['GET'])
def get_my_applications(username):
    apps = list(db.applications.find({'username': username}).sort('created_at', -1))
    for a in apps: a['_id'] = str(a['_id'])
    return jsonify({'success': True, 'applications': apps})

@app.route('/api/policy', methods=['GET', 'POST'])
def handle_policy():
    if request.method == 'POST':
        for k, v in request.json.items():
            db.policy_config.update_one({'key': k}, {'$set': {'value': str(v)}}, upsert=True)
        return jsonify({'success': True})
    config = {p['key']: p['value'] for p in db.policy_config.find()}
    return jsonify({'success': True, 'config': config})

# Initialize DB once on import for Vercel
try:
    init_db()
except Exception as e:
    print(f"Init DB error: {e}")

if __name__ == '__main__':
    print('🚀 Poonawalla Fincorp Backend (Gemini AI) running at http://localhost:5001')
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
