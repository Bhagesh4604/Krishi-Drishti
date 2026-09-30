# KRISHI-DRISHTI — COMPLETE TECHNICAL PROJECT AUDIT
## Documentation Package for Final-Year Engineering Report
**Prepared by:** Source Code Inspection (AI Technical Audit)
**Date:** September 28, 2026
**Source files inspected:** backend/main.py, backend/models.py, backend/routers/* (25 routers), backend/services/* (10 services), backend/ml_models/* (10 files), backend/bioacoustic_service/*, backend/blockchain/contracts/CarbonVault.sol, screens/* (29 screens), components/* (8 components), translations.ts, package.json, capacitor.config.ts, .env, requirements.txt, and all configuration files.

---

> [!IMPORTANT]
> All findings in this document are derived exclusively from the actual source code, configuration files, model files, and database schema. Nothing has been invented or assumed.

---

## PART 1 — COMPLETE PROJECT IDENTIFICATION

### 1. Exact Project Name
**Krishi-Drishti**
*(Source: `package.json` line 2, `capacitor.config.ts` line 5, `backend/main.py` line 31)*

### 2. Project Purpose
An AI-powered agricultural platform for Indian farmers that integrates satellite remote sensing, disease detection, carbon credit management, supply chain traceability, government scheme discovery, crop marketplace, weather forecasting, and bioacoustic pest detection.

### 3. Main Problem Being Solved
Indian farmers face fragmented access to: precision crop health data, disease diagnosis, carbon credit markets, supply chain transparency, government welfare schemes, and fair price discovery. Krishi-Drishti attempts to consolidate these into a single mobile-first platform with AI at its core.

### 4. Target Users
- Small and marginal farmers (primary)
- Corporate agri-buyers (secondary — CorporateDashboardScreen)
- Platform administrators / ops team (admin dashboard)
*(Source: models.py User model, CorporateDashboardScreen.tsx, backend/admin_dashboard.html)*

### 5. Main Modules / Features Actually Implemented

| # | Module | Classification |
|---|--------|---------------|
| 1 | OTP-based Authentication | **A — Fully implemented** |
| 2 | Farmer Profile (name, district, crops, land, category, language) | **A — Fully implemented** |
| 3 | Satellite Crop Health Monitoring (GEE + Sentinel-2 + SMAP) | **A — Fully implemented** (with simulation fallback) |
| 4 | Disease Detection (MobileNetV2 + Gemini Vision) | **A — Fully implemented** |
| 5 | AI Agricultural Advisory Chatbot (Gemini 2.0 Flash) | **A — Fully implemented** |
| 6 | Weather & Air Quality (Open-Meteo API) | **A — Fully implemented** |
| 7 | Government Schemes (Scheme Setu) | **A — Fully implemented** (static data + DB) |
| 8 | Crop Marketplace / Mandi Direct | **A — Fully implemented** |
| 9 | Carbon Vault / Carbon Credit Management | **A — Fully implemented** (simulated credits, not certified) |
| 10 | SOC (Soil Organic Carbon) Estimation | **A — Fully implemented** (GradientBoosting model) |
| 11 | Bioacoustic Pest Detection | **B — Partially implemented** (separate microservice, not integrated into main app flow) |
| 12 | Blockchain Evidence Anchoring (CarbonVault smart contract) | **B — Partially implemented** (Hardhat local network only) |
| 13 | Supply Chain Traceability (Harvest Tokens) | **A — Fully implemented** |
| 14 | Farmer KYC Verification | **A — Fully implemented** |
| 15 | Crop Cycle Tracking | **A — Fully implemented** |
| 16 | Smart Irrigation Engine | **A — Fully implemented** |
| 17 | Disease Risk Forecasting (weather-based, daily scheduler) | **A — Fully implemented** |
| 18 | Carbon Credit Marketplace (with Razorpay) | **A — Fully implemented** (Razorpay in demo mode if keys absent) |
| 19 | NDVI Anomaly Detection (weekly background job) | **A — Fully implemented** |
| 20 | Multilingual Support (English + Hindi UI; Gemini for others) | **B — Partially implemented** (only en + hi have full static translations; others fall back to English UI, Gemini translates dynamic content) |
| 21 | Corporate Dashboard | **A — Fully implemented** |
| 22 | Contracts / Forward Contracts | **A — Fully implemented** |
| 23 | Insurance Schemes | **A — Fully implemented** (static scheme DB, no real payment) |
| 24 | Community Posts | **A — Fully implemented** |
| 25 | Admin Dashboard (HTML) | **A — Fully implemented** |

### 6. Technologies Actually Used (Full Stack)

| Layer | Technology | Evidence |
|-------|-----------|---------|
| Frontend framework | React 19 + TypeScript | `package.json` |
| Build tool | Vite 6 | `package.json`, `vite.config.ts` |
| Styling | TailwindCSS 3 | `tailwind.config.js`, `package.json` |
| Mobile wrapper | Capacitor 8 (Android) | `capacitor.config.ts`, `android/` directory |
| Animation | Framer Motion 12 | `package.json` |
| Maps | Leaflet + React-Leaflet | `package.json` |
| QR codes | qrcode.react | `package.json` |
| 3D Globe | react-globe.gl + three.js | `package.json` |
| Backend framework | FastAPI (Python) | `backend/requirements.txt` |
| ASGI server | Uvicorn | `backend/requirements.txt` |
| ORM | SQLAlchemy 2.0 | `backend/requirements.txt` |
| DB migration | Alembic | `backend/requirements.txt` |
| Validation | Pydantic v2 | `backend/requirements.txt` |
| Auth | python-jose (JWT, HS256) + passlib (bcrypt) | `backend/auth_utils.py` |
| Task queue | Celery + Redis (with eager fallback) | `backend/celery_app.py`, `requirements.txt` |
| Scheduler | APScheduler 3 | `backend/main.py` |
| Rate limiting | slowapi | `backend/rate_limiter.py`, `requirements.txt` |
| AI/LLM | Google Gemini (`gemini-3.6-flash` referenced in code) | `backend/routers/ai_chat.py`, `translate.py` |
| Image processing | Pillow | `backend/requirements.txt` |
| ML — classification | TensorFlow/Keras | `backend/ml_models/`, `bioacoustic_service/` |
| ML — regression | scikit-learn (GradientBoosting, RandomForest) | `backend/ml_models/soil_carbon_estimator.py`, `yield_predictor.py` |
| Geospatial | Google Earth Engine Python API | `backend/services/gee_service.py` |
| Geospatial geometry | Shapely | `backend/requirements.txt` |
| Vector search | FAISS | `backend/requirements.txt` |
| BM25 ranking | rank-bm25 | `backend/requirements.txt` |
| HTTP client | httpx, requests | `backend/requirements.txt` |
| Blockchain | Hardhat + Solidity 0.8.20 + Web3.py | `backend/blockchain/`, `backend/services/blockchain.py` |
| Payment gateway | Razorpay | `backend/requirements.txt`, `backend/routers/marketplace.py` |
| Image CDN | Cloudinary | `.env`, `backend/services/upload_service.py` |
| Containerization | Docker + docker-compose | `docker-compose.yml`, `backend/Dockerfile` |
| PDF parsing | pdfplumber | `backend/requirements.txt` |

### 7. Frontend Technology
React 19 + TypeScript, built with Vite 6, styled with TailwindCSS 3, animated with Framer Motion 12. Packaged as an Android APK using Capacitor 8.
*(Source: `package.json`, `capacitor.config.ts`)*

### 8. Backend Technology
Python FastAPI with Uvicorn ASGI server. Background tasks via APScheduler and Celery (optional Redis). 25 API routers registered in `main.py`.
*(Source: `backend/main.py`, `backend/requirements.txt`)*

### 9. Database Technology
- **Default (development):** SQLite (`krishi_drishti.db` at project root)
- **Production option:** PostgreSQL (via `DATABASE_URL` environment variable)
- ORM: SQLAlchemy 2.0 with Alembic for migrations
*(Source: `backend/database.py`, `backend/alembic.ini`)*

### 10. Hosting / Deployment Technology
- **Local development:** Vite dev server (port 5173) + Uvicorn (port 8080 inferred from Capacitor config history)
- **Mobile:** Android APK via Capacitor
- **Optional Redis:** for Celery task queue
- **Docker:** `docker-compose.yml` present (multi-service)
- **No cloud hosting provider** is configured in the codebase. `.env` shows only local CORS origins.

### 11. APIs Used

| API | Purpose | Provider | Evidence |
|-----|---------|----------|---------|
| Google Gemini (gemini-3.6-flash) | AI chat, disease diagnosis, translation, evidence verification | Google | `backend/routers/ai_chat.py`, `translate.py`, `evidence_ai_verifier.py` |
| Open-Meteo (free, no key) | Current weather, 10-day forecast | Open-Meteo | `backend/routers/weather.py` |
| Open-Meteo Air Quality API | PM2.5, PM10, AQI | Open-Meteo | `backend/routers/weather.py` |
| Open-Meteo Geocoding API | Location name search | Open-Meteo | `backend/routers/weather.py` |
| OpenStreetMap Nominatim | Reverse geocoding | OSM | `backend/routers/weather.py` |
| BigDataCloud | Reverse geocoding fallback | BigDataCloud | `backend/routers/weather.py` |
| Google Earth Engine | Sentinel-2, Sentinel-1 SAR, NASA SMAP | Google / ESA / NASA | `backend/services/gee_service.py` |
| Cloudinary | Evidence photo upload and storage | Cloudinary | `backend/services/upload_service.py`, `.env` |
| Razorpay | Carbon credit marketplace payments | Razorpay | `backend/routers/marketplace.py`, `requirements.txt` |
| AgroMonitoring API | Polygon ID (field in `Plot` model, key is empty in .env) | AgroMonitoring | `backend/models.py` line 167, `.env` |

> [!WARNING]
> The `AGROMONITORING_API_KEY` in `.env` is **empty**. AgroMonitoring functionality is not active. The `polygon_id` field in the `Plot` model is populated but the corresponding API integration is not invoked in the inspected router code.

### 12. AI / ML Models Actually Used

| Model | Purpose | Type | Evidence |
|-------|---------|------|---------|
| MobileNetV2 (mobilenetv2_5_class.h5, ~25 MB) | Leaf disease classification | CNN — 5 classes | `backend/ml_models/`, `ai_chat.py` lines 596–607 |
| EfficientNet (plant_disease_efficientnet.h5, ~45 MB) | Disease detection (secondary — not called in routers inspected) | CNN | `backend/ml_models/` — file present |
| Universal Vision Model (universal_vision_model.h5, ~25 MB) | Unknown — class labels are archive folders (not plant diseases) | CNN | `backend/ml_models/universal_vision_model.json` — labels are "archive", "archive (2)", etc. |
| GradientBoostingRegressor (soil_carbon_estimator.py) | SOC estimation in t/ha | Regression | `backend/ml_models/soil_carbon_estimator.py` |
| RandomForestRegressor (yield_predictor.py) | Crop yield prediction (t/ha) | Regression | `backend/ml_models/yield_predictor.py` |
| Rule-Based Epidemiological Model (disease_risk_model.py) | Weather-based disease risk alerts | Rule-based (not ML) | `backend/ml_models/disease_risk_model.py` |
| CNN — Bioacoustic pest detector (pest_audio_model.h5, ~147 MB) | Pest detection from .wav audio | Binary CNN classifier | `backend/bioacoustic_service/` |
| Google Gemini Vision (LLM) | Disease treatment advice, evidence verification, grading | Generative AI (not trained CNN) | `backend/routers/ai_chat.py` |
| Linear Regression (inline, sklearn) | On-demand SOC calibration from farmer-entered lab data | Regression | `backend/routers/ai_chat.py` lines 215–230 |

### 13. External Services Actually Used
Google Gemini, Google Earth Engine, Open-Meteo, OpenStreetMap Nominatim, BigDataCloud, Cloudinary, Razorpay. *(AgroMonitoring: key present but empty.)*

### 14. Authentication System
- **Method:** OTP-based phone authentication
- **OTP generation:** Hardcoded to `"1234"` in production code; master OTP `"0000"` always works
- **Token:** JWT (HS256) via `python-jose`, 3000-minute expiry
- **Storage:** In-memory Python dict (`otp_store`) — resets on server restart
- **Admin auth:** Static secret token `kd_admin_KrishiDrishti2026` (from `.env`) passed as header
*(Source: `backend/routers/auth.py`, `backend/auth_utils.py`)*

> [!CAUTION]
> **Critical Security Issues Identified:** (1) OTP is hardcoded to "1234". (2) Master OTP "0000" bypasses all OTP validation. (3) JWT `SECRET_KEY` defaults to `"supersecretkey_change_me_in_prod"`. (4) Admin token is stored in `.env` committed to disk. (5) No actual SMS service integrated.

### 15. File / Image Upload Functionality
- **Primary:** Cloudinary (cloud CDN) — evidence photos, KYC documents, practice logs
- **Fallback:** Local disk storage (`backend/uploads/`) when Cloudinary is not configured
- **Formats:** Images (JPEG, PNG, WEBP), PDF (lab certificates), MP4/video (soil sampling video)
*(Source: `backend/services/upload_service.py`, `backend/models.py`)*

### 16. Cloud Services
- Google Cloud (Earth Engine via project `agri-drishti` — from `.env`)
- Cloudinary (media CDN)
- Redis (optional, for Celery)

### 17. APIs for Weather, Maps, Satellite, Government, Market Data
- **Weather:** Open-Meteo (free, no key required)
- **Maps / Geocoding:** OpenStreetMap Nominatim, BigDataCloud
- **Satellite:** Google Earth Engine (Sentinel-2, Sentinel-1 SAR, NASA SMAP)
- **Government schemes:** Static data seeded into local SQLite database (not a live government API)
- **Market data:** Gemini LLM (text response from training data — not a live Mandi API)

### 18. Blockchain Implementation
- **Status: B — Partially implemented**
- **Smart contract:** `CarbonVault.sol` (Solidity 0.8.20) — single function `logEvidence()` that stores evidence SHA-256 hash on-chain
- **Network:** Hardhat local node (chainId 31337) — configured at `http://127.0.0.1:8545`
- **Integration:** `backend/services/blockchain.py` — connects via Web3.py to local Hardhat node
- **Actual on-chain activity:** None verifiable in production. The `.env` has a `CARBON_VAULT_ADDRESS` pointing to a local Hardhat deployment address (`0x5FbDB2315678afecb367f032d93F642f64180aa3`). No public blockchain.
- **Harvest token chain:** SHA-256 based hash-chain (application-level, not on public blockchain)
- **Merkle anchors:** `MerkleAnchor` table exists in DB; `l2_tx_hash` field for future L2 blockchain (not connected to any live chain)

### 19. Carbon Credit Functionality
- **Status: B — Partially implemented / Simulated**
- Comprehensive carbon project management workflow (enroll, evidence, verify, issue tokens)
- VM0042 Verra methodology calculator implemented (`backend/services/vm0042_calculator.py`)
- Credits are **simulated/estimated** — no certification from Verra, Gold Standard, or any accredited VVB
- 15% buffer pool deduction implemented (Verra standard)
- 5-pillar dMRV framework (KYC, soil samples, remote sensing, AI evidence screen, L1/L2 human review) is **architecturally designed but not connected to real-world verifiers**
- Razorpay payment integration for credit marketplace (demo mode without live keys)

### 20. Bioacoustic Functionality
- **Status: B — Partially implemented** (separate microservice, not integrated into main FastAPI app)
- Separate FastAPI server at port 8002 (`backend/bioacoustic_service/server.py`)
- CNN model: 3 Conv2D layers + Dense layers, binary classification (pest / no pest)
- Audio preprocessing: Mel-spectrogram, 44100 Hz SR, 128 mel bands, 10-second window
- Training data: 95 `.wav` files in `insect_sounds/` folder (real insect recordings)
- Negative examples: Synthetic random noise (added programmatically)
- Pest type heuristic: spectral centroid frequency range mapping (Cicada >5kHz, Locust 3-5kHz, Beetle 1.5-3kHz, Grub/Stem Borer <1.5kHz)
- The `BioacousticScreen.tsx` calls this service, but the service runs independently

### 21. SOC / Soil Organic Carbon Functionality
- **Status: A — Fully implemented**
- GradientBoostingRegressor trained on ICAR-NBSS data (CSV file at `backend/data/soc_training_data.csv`)
- Falls back to principled synthetic data if CSV is missing
- Features: NDVI, EVI, soil moisture, days enrolled
- Output: SOC in t/ha (bounded to 10–42 t/ha for Indian soils)
- Integrated into GEE monitoring pipeline

### 22. Disease Detection Functionality
- **Status: A — Fully implemented**
- MobileNetV2 model (mobilenetv2_5_class.h5) classifies to 5 classes
- Gemini Vision provides treatment recommendations (generative, not classification)
- `class_labels_disease.json` lists 15 classes (PlantVillage-derived: Pepper, Potato, Tomato diseases)

### 23. Marketplace / Mandi Functionality
- **Status: A — Fully implemented**
- Two marketplaces: (1) Crop listings (`/api/market`) — buy/sell crops; (2) Carbon credit marketplace (`/api/marketplace`)
- Crop listings: create, browse, filter by crop/location
- Market price inquiry: Gemini LLM answers (not live Mandi data)

### 24. Chatbot / Advisory Functionality
- **Status: A — Fully implemented**
- Gemini 2.0 Flash powered chatbot ("Krishi-AI")
- System prompt includes farmer profile (name, district, crops, land size, language)
- Conversation history stored in DB (last 5 messages fetched as context)
- Responds in the farmer's configured language
- Voice assistant: `VoiceAssistantModal.tsx` component present

### 25. Multilingual Functionality
- **Status: B — Partially implemented**
- Languages declared: English, Hindi, Marathi, Bengali, Telugu, Tamil, Kannada, Punjabi
- Static UI translations: Only English (full) and Hindi (full) in `translations.ts`; all others fall back to English object
- AI-generated content: Gemini instructed to respond in farmer's language
- Dynamic content: `backend/routers/translate.py` uses Gemini for real-time translation
- Static dict in translate.py: Hindi, Kannada, Marathi (partial UI terms only)

---

## PART 2 — COMPLETE USER WORKFLOW

### Workflow 1: Farmer Registration / Login
```
User opens app (SplashScreen.tsx)
→ AuthScreen.tsx: Enter phone number
→ POST /api/auth/send-otp → Backend generates OTP "1234" (hardcoded), stores in-memory dict
→ AuthScreen: Enter OTP
→ POST /api/auth/verify-otp → Validates OTP (or master "0000")
→ If new user: User record created in SQLite with phone number only
→ JWT access token returned (HS256, 3000-min expiry)
→ If name is null → Profile creation screen
→ ProfileScreen.tsx: Enter name, district, land size, category, farming type, crops, language
→ PUT /api/users/profile → User record updated
→ DashboardScreen.tsx loaded
```

### Workflow 2: Crop Health Monitoring (Satellite)
```
Farmer opens CropHealthDashboard.tsx
→ Selects existing plot or marks new field in LandMarkingScreen.tsx (Leaflet map)
→ POST /api/plots/ → Plot record created (coordinates as JSON, area in acres)
→ GET /api/carbon/analyze → backend calls EarthEngineService.monitor_plot()
   - If GEE credentials available:
     → Fetches Sentinel-2 collection (COPERNICUS/S2_SR_HARMONIZED)
     → Cloud masking (<20% cloud cover filter)
     → Computes indices: NDVI, EVI, NDMI, NDRE, MSAVI, GNDVI, NBR
     → Soil moisture from NASA SMAP (SPL4SMGP/008)
     → 6-month NDVI timeline (monthly composites)
     → SAR fallback: Sentinel-1 GRD if optical unavailable
   - If GEE unavailable/fails:
     → Deterministic simulation using MD5 hash of plot seed string
→ SOC estimated via GradientBoostingRegressor
→ Yield predicted via RandomForestRegressor
→ Carbon credit eligibility computed (IPCC ER = BE - PE - LE formula)
→ Results returned to CropHealthDashboard (indices, timeline chart, carbon score)
→ PlotHistory record saved in DB (ndvi, evi, msavi, is_anomaly)
```

### Workflow 3: Disease Detection
```
Farmer opens VisionScreen.tsx
→ Captures/uploads leaf photo
→ POST /api/ai/diagnose (multipart file)
→ Backend (ai_chat.py):
   Step 1 — Local CNN classification:
     - Loads mobilenetv2_5_class.h5 (5-class MobileNetV2)
     - Resizes image to 128×128, normalizes to [0,1]
     - Predicts class index + confidence
     - If "healthy" with >70% confidence → returns immediately
   Step 2 — Gemini Vision (generative advisory):
     - If disease found: prompt includes predicted disease name, asks for treatment
     - If model unavailable: pure Gemini zero-shot diagnosis
     - Gemini returns JSON: diagnosis, confidence, summary, health_score, remedies[]
→ VisionResultScreen.tsx displays: disease name, confidence, organic/chemical remedies
```

### Workflow 4: AI Agricultural Advisory Chat
```
Farmer opens ChatScreen.tsx
→ Types query in local language
→ POST /api/ai/chat
→ Backend (ai_chat.py):
   - Fetches last 5 messages from chat_messages DB table
   - Builds system prompt with farmer profile (name, district, crops, land, language)
   - Constructs full prompt with history + new message
   - Calls Gemini (run_in_executor to avoid blocking event loop)
   - Response generated in farmer's configured language
   - Both user message and AI response saved to DB
→ Response rendered in ChatScreen with markdown support (react-markdown)
```

### Workflow 5: Weather Forecasting
```
Farmer opens ForecastScreen.tsx or WeatherModal.tsx
→ App obtains GPS coordinates (Capacitor Geolocation)
→ GET /api/weather/current?lat=x&lng=y
   - Calls Open-Meteo API (forecast_days=10)
   - Parameters: temperature, humidity, rain, wind, UV index, soil temperature, cloud cover
   - Hourly + daily breakdown returned
   - Fallback: weather_response.json served if Open-Meteo unreachable
→ GET /api/weather/airquality?lat=x&lng=y (PM2.5, PM10, AQI from Open-Meteo Air Quality)
→ Disease risk alerts generated by background daily scheduler (not weather modal)
→ ForecastScreen displays: current conditions, 10-day daily forecast, hourly chart
```

### Workflow 6: Disease Risk Forecasting (Automated Background)
```
APScheduler fires daily (interval: 1 day):
→ Queries all Plot records from DB
→ For each plot with crop_type and valid coordinates:
   - Fetches 5-day weather from Open-Meteo via weather_fetcher.py
   - Calls evaluate_disease_risk(weather_data, crop_type) — rule-based model
   - Rules check: avg_temp, avg_humidity, total_precip, diurnal_range, days_wet, days_humid
   - Matches crop to disease checkers (wheat/rice/cotton/sugarcane/tomato/maize/soybean/potato/grapes)
   - Creates DiseaseRiskAlert records in DB (disease_name, risk_level, recommendation)
→ Old alerts for that plot set to is_active=False
→ Dashboard shows active alerts
```

### Workflow 7: Carbon Credit Enrollment and Issuance
```
Farmer opens CarbonVaultScreen.tsx
→ Step 1 — KYC (prerequisite):
   POST /api/kyc/submit: uploads Aadhaar/Voter ID + land deed
   Admin reviews at /api/admin/kyc/queue → approves/rejects
   User.kyc_status set to "Verified"

→ Step 2 — Enroll in Carbon Project:
   POST /api/carbon/projects: selects plot + methodology (Cover-Crop/No-Till/Agroforestry)
   - Additionality check: is_additional() checks if practice is common in region
   - NDVI gate: GEE scan run; if NDVI too low, enrollment rejected
   - CarbonProject record created (status="Enrolled")

→ Step 3 — Upload Evidence:
   POST /api/carbon/projects/{id}/evidence: farmer submits geotagged photos
   - SHA-256 hash computed from raw file bytes (evidence_hash)
   - EXIF data extracted (GPS, timestamp, device)
   - Geospatial validation: GPS distance from plot polygon centroid computed
   - AI auto-screen: Gemini Vision analyzes photo (evidence_ai_verifier.py)
     → Returns: is_farm_field, practice_visible, confidence, ai_status (passed/flagged/rejected)
   - Blockchain anchoring attempted: if Hardhat node running, tx sent to CarbonVault.logEvidence()
   - CarbonEvidence record saved with: evidence_hash, ai_status, ai_confidence, review_status

→ Step 4 — Soil Sample Upload:
   POST /api/carbon/projects/{id}/soil: farmer enters lab results (SOC%, bulk density, pH)
   Uploads lab PDF certificate
   Admin verifies: sets admin_soc_percent, admin_bulk_density

→ Step 5 — Satellite Verification (Pillar 3):
   POST /api/carbon/projects/{id}/remote-sensing: triggers GEE scan, saves NDVI/EVI

→ Step 6 — Admin Review (L1/L2):
   Admin dashboard reviews all evidence
   L1 reviewer approves/rejects each piece
   L2 reviewer gives final sign-off
   All 4 pillars must be True: pillar1_land_activity, pillar2_soil_sampling, pillar3_remote_sensing, pillar4_verification

→ Step 7 — Credit Issuance:
   Admin issues credits via carbon_projects.py
   VM0042 formula applied: ER = BE - PE - LE
   15% buffer pool deducted
   CarbonCreditToken records minted (token_id format: KD-C-2026-XXXXX)
   Token hash = SHA-256 of token data

→ Step 8 — Carbon Credit Marketplace:
   Farmer lists credits: POST /api/marketplace/list
   Buyer browses: GET /api/marketplace/listings
   Buyer purchases: POST /api/marketplace/purchase → Razorpay order created
   Payment verified: POST /api/marketplace/payment/verify → signature HMAC check
   On success: credits transferred, retirement certificate generated (KD-RET-YYYY-NNNNN)
   Retirement hash = SHA-256 of retirement data
```

### Workflow 8: Crop Marketplace (Mandi Direct)
```
Farmer opens MarketScreen.tsx
→ CREATE listing: POST /api/market/ (crop_name, quantity, price, location, is_organic, image_url)
→ Listing stored in DB (listings table)
→ Buyers browse: GET /api/market/?crop=wheat&location=nagpur
→ Buyer contacts seller directly (phone number shown — no in-app order/payment for crop listings)
→ Price check: GET /api/market/price-check?query=wheat → Gemini LLM answers current Mandi prices
```

### Workflow 9: Government Schemes
```
Farmer opens GovernmentSchemesScreen.tsx
→ GET /api/schemes/ → Returns scheme list from DB
→ If DB empty, 7 default schemes seeded: PMFBY, PMKSY, PKVY, PM-Kisan, KCC, PM-KUSUM, Soil Health Card
→ Farmer filters/browses schemes
→ Farmer clicks "Apply Now": POST /api/schemes/apply
→ SchemeApplication record created (status="In Review")
→ Application is internal DB record only — does NOT submit to government portal
→ External government link provided for actual application
```

> [!IMPORTANT]
> The platform does NOT submit applications to government portals. It creates an internal application record and provides external links. This distinction is critical for the report.

### Workflow 10: Supply Chain Traceability
```
Farmer opens TraceabilityScreen.tsx
→ Create Crop Cycle: POST /api/trace/cycles (crop_type, variety)
→ Log Events: POST /api/trace/cycles/{id}/events (Sowing, Fertilizing, Weeding, Inspection, Harvest)
   - Each event has: geo_lat, geo_lng, media_url, notes, event_hash (SHA-256)
→ Mint Harvest Token: POST /api/trace/mint
   - Token ID: KD-HTK-YYYY-NNNNN
   - Includes: yield_kg, area_harvested, chemical_inputs, NDVI at harvest
   - token_hash = SHA-256 of all fields + previous_hash (creates hash chain)
   - Daily Merkle anchors computed for tamper detection
→ Transfer: POST /api/trace/tokens/{id}/transfer (buyer_name, buyer_entity)
→ Buyer verifies: GET /api/trace/verify/{token_id} (public, no auth required)
→ QR code generated with public verify URL
```

### Workflow 11: Smart Irrigation
```
Farmer opens SmartIrrigationScreen.tsx
→ Enters: crop_type, soil_type, weather_condition, plot_area_acres
→ POST /api/irrigation/schedule
→ Backend (irrigation.py):
   - Looks up CROP_WATER_REQ table (12 crops, liter/acre/day)
   - Applies SOIL_RETENTION multiplier (6 soil types)
   - Applies WEATHER_ADJ multiplier (Sunny/Cloudy/Rainy/Hot/Normal)
   - Generates 7-day schedule: daily water requirement, irrigation flag
   - Gemini augments schedule with precision agronomic tips
→ Frontend displays 7-day irrigation schedule
```

### Workflow 12: Bioacoustic Pest Detection
```
Farmer opens BioacousticScreen.tsx
→ Records audio in field (WAV format)
→ POST (to port 8002 bioacoustic microservice) /analyze-audio
→ server.py:
   - Loads pest_audio_model.h5 (binary CNN)
   - Converts audio to Mel-spectrogram (librosa): SR=44100, n_mels=128, fmin=1000 Hz
   - Normalizes to fixed 10-second window (1723 frames)
   - CNN predicts: pest_detected (>0.5 threshold), confidence score
   - If pest detected: librosa spectral centroid used for pest type heuristic
→ Returns: pest_detected, confidence, pest_type
```

---

## PART 3 — SCREEN-BY-SCREEN ANALYSIS

| # | Screen | File | Purpose | AI/ML | Screenshot Caption |
|---|--------|------|---------|-------|-------------------|
| 1 | Splash Screen | SplashScreen.tsx | App loading animation | None | Figure X.X: Splash Screen of Krishi-Drishti Mobile Application |
| 2 | Auth Screen | AuthScreen.tsx | Phone OTP login/registration | None | Figure X.X: OTP-Based Authentication Screen |
| 3 | Dashboard | DashboardScreen.tsx | Main hub — weather widget, alerts, quick access | Disease risk alerts | Figure X.X: Farmer Dashboard of the Krishi-Drishti Platform |
| 4 | Farmer Profile | ProfileScreen.tsx | Edit name, district, crops, land, language | None | Figure X.X: Farmer Profile and Personalization Settings |
| 5 | Crop Health Dashboard | CropHealthDashboard.tsx | Satellite NDVI/EVI monitoring per plot | GEE, SOC model, Yield RF | Figure X.X: Satellite-Based Crop Health Dashboard |
| 6 | Land Marking | LandMarkingScreen.tsx | Draw farm polygon on Leaflet map | None | Figure X.X: Farm Land Marking and Polygon Drawing Interface |
| 7 | Vision / Disease Scan | VisionScreen.tsx | Upload leaf image for disease detection | MobileNetV2 + Gemini | Figure X.X: AI-Powered Crop Disease Detection Input Screen |
| 8 | Vision Result | VisionResultScreen.tsx | Disease diagnosis result with remedies | MobileNetV2 + Gemini | Figure X.X: Disease Diagnosis Result with Organic and Chemical Remedies |
| 9 | Chat (Krishi-AI) | ChatScreen.tsx | Multilingual agricultural advisory chat | Gemini 2.0 Flash | Figure X.X: Krishi-AI Multilingual Agricultural Advisory Chatbot |
| 10 | Forecast / Weather | ForecastScreen.tsx | 10-day weather + air quality | Open-Meteo API | Figure X.X: 10-Day Weather Forecast and Air Quality Module |
| 11 | Market Screen | MarketScreen.tsx | Browse crop listings with search/filter | Gemini (price check) | Figure X.X: Mandi Direct Crop Marketplace Screen |
| 12 | Market Detail | MarketDetailScreen.tsx | Individual crop listing detail | None | Figure X.X: Crop Listing Detail and Seller Contact View |
| 13 | Marketplace (Carbon) | MarketplaceScreen.tsx | Carbon credit listings + Razorpay buy | None | Figure X.X: Carbon Credit Marketplace with Payment Integration |
| 14 | Government Schemes | GovernmentSchemesScreen.tsx | Browse and apply to government schemes | None | Figure X.X: Government Scheme Discovery and Application (Scheme Setu) |
| 15 | Carbon Vault | CarbonVaultScreen.tsx | Carbon project management (enroll, evidence, issue) | GEE, Gemini Vision, GBR | Figure X.X: Carbon Vault — Farmer Carbon Credit Enrollment and Management |
| 16 | Carbon Model | CarbonModelScreen.tsx | Carbon calculation visualization | SOC model | Figure X.X: Carbon Credit Calculation Model Screen |
| 17 | Bioacoustic | BioacousticScreen.tsx | Pest detection from audio recording | CNN audio model | Figure X.X: Bioacoustic Pest Detection Module |
| 18 | Traceability | TraceabilityScreen.tsx | Harvest token creation and transfer | SHA-256 hash chain | Figure X.X: Blockchain-Based Crop Traceability and Harvest Tokenization |
| 19 | Traceability Verify | TraceabilityVerifyScreen.tsx | Public QR scan verification of harvest token | None | Figure X.X: Public Harvest Token Verification Interface |
| 20 | Crop Cycle | CropCycleScreen.tsx | Crop cycle event logging with geotagging | None | Figure X.X: Geo-Tagged Crop Cycle Event Logging |
| 21 | Crop Stress | CropStressScreen.tsx | Crop stress analysis with VRA recommendations | Gemini | Figure X.X: Crop Stress Analysis and Variable Rate Application Recommendations |
| 22 | Smart Irrigation | SmartIrrigationScreen.tsx | 7-day irrigation schedule | Agronomic rules + Gemini | Figure X.X: AI-Enhanced Smart Irrigation Scheduling |
| 23 | Farm Map | FarmMapScreen.tsx | Overview of all farm plots on map | None | Figure X.X: Farmer Plot Overview Map |
| 24 | Insurance | InsuranceScreen.tsx | Browse government crop insurance schemes | None | Figure X.X: Crop Insurance Scheme Discovery |
| 25 | KYC | KYCScreen.tsx | Upload identity + land documents for verification | None | Figure X.X: Farmer KYC Document Submission |
| 26 | Corporate Dashboard | CorporateDashboardScreen.tsx | Agri-buyer analytics and sourcing | None | Figure X.X: Corporate Agri-Buyer Dashboard |
| 27 | Contracts | ContractsScreen.tsx | Forward contract listing and signing | None | Figure X.X: Forward Agricultural Contracts Module |
| 28 | Digital Twin | DigitalTwinScreen.tsx | Digital twin placeholder (small file, 8KB) | Unknown | Figure X.X: Farm Digital Twin Concept View |
| 29 | Landing Screen | LandingScreen.tsx | App onboarding landing page | None | Figure X.X: Krishi-Drishti Application Landing / Onboarding Screen |

---

## PART 4 — TECHNICAL ARCHITECTURE

### Actual Architecture

```
FARMER (Android Device — Capacitor 8 APK)
        ↓ HTTPS/HTTP requests
REACT 19 + TypeScript Frontend (Vite 6 / TailwindCSS 3)
   - 29 screen components
   - Leaflet maps, Framer Motion animations
   - Capacitor Geolocation, Capacitor HTTP
        ↓ REST API calls (axios / fetch)
FASTAPI BACKEND (Python, Uvicorn)
   - 25 API routers
   - JWT auth middleware (HS256)
   - Rate limiting (slowapi)
   - APScheduler (background: daily disease forecast, weekly anomaly detection)
   - Celery + Redis (optional async tasks: GEE analysis)
        ↓
┌─────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                          │
│  EarthEngineService → Google Earth Engine API           │
│  GeminiWrapper     → Google Gemini API                  │
│  WeatherFetcher    → Open-Meteo API                     │
│  UploadService     → Cloudinary CDN                     │
│  BlockchainService → Hardhat Local Node (dev only)      │
│  EvidenceIntegrity → SHA-256, EXIF, GPS checks          │
│  EvidenceAIVerifier → Gemini Vision                     │
│  VM0042Calculator  → Verra-aligned carbon math          │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│                  ML MODEL LAYER                         │
│  MobileNetV2  → Disease classification (5 classes)      │
│  GradientBoostingRegressor → SOC estimation             │
│  RandomForestRegressor → Yield prediction               │
│  Rule-Based Epidemiological Model → Disease risk        │
└─────────────────────────────────────────────────────────┘
        ↓
SQLite DATABASE (krishi_drishti.db) / PostgreSQL (optional)
SQLAlchemy 2.0 ORM, Alembic migrations
        ↓
RESULT → JSON API response → Frontend → Farmer screen
```

### Data Flow for Key Operations

**Disease Detection:**
`Farmer camera → VisionScreen → POST /api/ai/diagnose → Pillow (resize 128×128) → MobileNetV2.predict() → [if Gemini available] Gemini Vision → JSON response`

**Satellite Analysis:**
`Plot polygon → POST /api/carbon/analyze → EarthEngineService → ee.ImageCollection(COPERNICUS/S2_SR_HARMONIZED) → Cloud masking → NDVI/EVI/MSAVI computation → SOC model → Yield model → Carbon math → JSON`

**Carbon Credit Issuance:**
`KYC Verified → Plot created → CarbonProject enrolled → Evidence uploaded → AI screened → L1/L2 reviewed → VM0042 calculated → Admin issues CarbonCreditToken → Token hash → DB`

---

## PART 5 — AI / MACHINE LEARNING ANALYSIS

### Model 1: MobileNetV2 Plant Disease Classifier

| Property | Value |
|----------|-------|
| Model name | `mobilenetv2_5_class.h5` |
| File size | ~25 MB |
| Architecture | MobileNetV2 (transfer learning assumed from base architecture) |
| Purpose | Classify leaf images into 5 disease categories |
| Input | RGB image, resized to 128×128, normalized to [0, 1] |
| Output | Softmax probabilities over 5 classes |
| Classes (5) | healthy, early blight, late blight, bacterial spot, leaf mold |
| Dataset claimed | PlantVillage (inferred from class names; not explicitly stated in code) |
| Training evidence | `.h5` file present; no training script found in project |
| Training R²/accuracy | **Not verifiable from project files** |
| Data augmentation | Not verifiable from project files |
| Train/val/test split | Not verifiable from project files |
| Hyperparameters | Input size: 128×128 (from `ai_chat.py` line 629); other params not verifiable |
| Loss function | Not verifiable from project files |
| Optimizer | Not verifiable from project files |
| Epochs | Not verifiable from project files |
| Batch size | Not verifiable from project files |

> [!NOTE]
> The `class_labels_disease.json` file lists 15 classes (PlantVillage format), but the in-code label list for the `.h5` model contains only 5 classes. This suggests the `.h5` model was trained separately on a subset, then loaded with a custom 5-class label list in code. **Training evidence was not found** — only the trained `.h5` weight file is present.

### Model 2: EfficientNet Plant Disease Classifier

| Property | Value |
|----------|-------|
| Model name | `plant_disease_efficientnet.h5` |
| File size | ~45 MB |
| Purpose | Disease detection (secondary — file present but not called in inspected routers) |
| Classes | Inferred from `class_labels_disease.json`: 15 classes (PlantVillage) |
| Training evidence | **Not found** |
| Usage | **Not verifiable — model file exists but no code calls it in inspected routers** |

### Model 3: Universal Vision Model

| Property | Value |
|----------|-------|
| Model name | `universal_vision_model.h5` / `universal_vision_model.json` |
| File size | ~25 MB |
| Class labels | "archive", "archive (2)" ... "archive (9)" — 9 classes |
| Purpose | **Not determinable** — class labels indicate folder names from training data prep, not disease names |
| Training evidence | **Not found** |

> [!CAUTION]
> The `universal_vision_model.json` file contains class labels that are Windows folder names (`archive`, `archive (2)`, etc.), not meaningful agricultural classes. This model's purpose and validity cannot be determined from the project files.

### Model 4: SOC GradientBoostingRegressor

| Property | Value |
|----------|-------|
| Model | `GradientBoostingRegressor` (scikit-learn) |
| Training data source | ICAR-NBSS District-Level SOC Survey (Maharashtra), CSV at `backend/data/soc_training_data.csv` |
| Fallback | 200-sample principled synthetic dataset if CSV missing |
| Features (4) | NDVI, EVI, volumetric soil moisture (%), days enrolled |
| Target | SOC in t/ha |
| Ground truth range | 12–37 t/ha (Maharashtra) |
| Hyperparameters | n_estimators=150, max_depth=4, learning_rate=0.08, subsample=0.85, random_state=42 |
| Output bounds | [10.0, 42.0] t/ha |
| Training R² | Reported at runtime via `_model.score(X, y)` — **not verifiable from files** |
| Validation | None — trained and evaluated on same dataset (no separate test split in code) |

### Model 5: Yield RandomForestRegressor

| Property | Value |
|----------|-------|
| Model | `RandomForestRegressor` (scikit-learn) |
| Training data | Synthetically generated from ICAR/DES yield baselines (code in `yield_predictor.py`) |
| Crops covered | 25 crop types |
| Features (3) | health_score (NDVI+EVI composite), moisture (%), crop_id (encoded integer) |
| Target | Yield in t/ha |
| Yield baselines | ICAR/DES Crop Production Statistics 2022-23 |
| Hyperparameters | n_estimators=100, max_depth=8, min_samples_leaf=4, random_state=42 |
| Training R² | Reported at runtime — **not verifiable from files** |
| Note | Training data is programmatically generated using ICAR baseline + noise — not field-collected |

### Model 6: Disease Risk Epidemiological Model

| Property | Value |
|----------|-------|
| Type | Rule-based (NOT a trained ML model) |
| Source | ICAR Annual Disease Advisory, FAO Crop Protection Guidelines, ICAR-CRIDA WBCDR framework |
| Crops | Wheat, Rice, Cotton, Sugarcane, Tomato, Maize, Soybean, Potato, Grapes |
| Input | 5-day weather window: temp (°C), humidity (%), precipitation (mm) |
| Features computed | avg_temp, avg_humidity, total_precip, min_temp, max_temp, diurnal_range, days_wet, days_humid |
| Output | List of disease alerts (disease_name, risk_level, recommendation, source) |
| Diseases modelled | ~25 disease-crop combinations |
| Risk levels | High, Medium, Low |

### Model 7: Bioacoustic CNN

| Property | Value |
|----------|-------|
| Model | 3×Conv2D + MaxPooling2D + Flatten + Dense + Dropout + Sigmoid |
| Framework | TensorFlow/Keras |
| File | `pest_audio_model.h5` (~147 MB) |
| Task | Binary: pest present (1) or absent (0) |
| Audio preprocessing | 44100 Hz SR, Mel-spectrogram (n_fft=1024, hop=256, n_mels=128, fmin=1000 Hz) |
| Input shape | (128, 1723, 1) — 10-second window |
| Training data | 95 `.wav` files (insect sounds from academic corpus) + synthetic random noise negatives |
| Epochs | 5 (from `model_trainer.py` line 120) |
| Batch size | 8 |
| Validation split | 20% |
| Optimizer | Adam |
| Loss | Binary cross-entropy |
| Accuracy | **Not verifiable from project files** |
| Pest type | Determined by spectral centroid heuristic post-prediction (not a multi-class model) |

---

## PART 6 — DISEASE DETECTION — DETAILED

### Architecture
- **Stage 1 — Classification:** MobileNetV2 (`mobilenetv2_5_class.h5`), 5 classes
- **Stage 2 — Advisory:** Google Gemini Vision API (generative)

These are two **distinct** systems. MobileNetV2 performs the classification. Gemini does NOT classify — it generates treatment recommendations given the already-classified disease name.

### Image Preprocessing (from `ai_chat.py` lines 628–631)
```python
img_resized = image.resize((128, 128))          # PIL resize
img_array = np.array(img_resized, dtype=np.float32) / 255.0  # Normalize [0,1]
img_array = np.expand_dims(img_array, axis=0)   # Add batch dim → shape (1, 128, 128, 3)
```

### MobileNetV2 Classes (5)
1. healthy
2. early blight
3. late blight
4. bacterial spot
5. leaf mold

*(Note: These are the in-code labels. The `class_labels_disease.json` has 15 PlantVillage classes — mismatch suggests separate training.)*

### Inference Result
- `class_idx = np.argmax(predictions)` → predicted class
- `confidence_score = int(predictions[class_idx] * 100)` → percentage
- If "healthy" + confidence > 70 → returns immediately without calling Gemini

### Gemini Advisory (generative, not classification)
- Input: Predicted disease name + image (multipart)
- Output (JSON): `diagnosis`, `confidence`, `summary`, `health_score`, `remedies[]`
- Each remedy: `title`, `desc`, `type` (organic/chemical)

### Accuracy / Precision / Recall / F1
**Not verifiable from provided project files.** No training script, evaluation notebook, or metrics file found in the project.

### Fallback
If `mobilenetv2_5_class.h5` is not loadable, the system falls back to pure Gemini zero-shot diagnosis.

---

## PART 7 — SATELLITE / REMOTE SENSING

### Data Sources
| Source | Collection ID | Purpose |
|--------|-------------|---------|
| Sentinel-2 (ESA) | `COPERNICUS/S2_SR_HARMONIZED` | Optical vegetation indices |
| Sentinel-1 SAR (ESA) | `COPERNICUS/S1_GRD` | Fallback when cloud cover >20% |
| NASA SMAP | `NASA/SMAP/SPL4SMGP/008` | Soil moisture (surface + rootzone) |

### Spectral Indices Computed (verified in `gee_service.py`)

| Index | Formula | Bands Used | Purpose |
|-------|---------|-----------|---------|
| **NDVI** | (B8 - B4) / (B8 + B4) | NIR, Red | Overall vegetation health |
| **EVI** | 2.5 × ((B8 - B4) / (B8 + 6×B4 - 7.5×B2 + 1)) | NIR, Red, Blue | Vegetation, reduced soil/atmosphere noise |
| **NDMI** | (B8 - B11) / (B8 + B11) | NIR, SWIR11 | Moisture content |
| **NDRE** | (B8A - B5) / (B8A + B5) | Narrow NIR, Red Edge 1 | Nitrogen/chlorophyll status |
| **MSAVI** | (2×B8 + 1 - √((2×B8 + 1)² - 8×(B8 - B4))) / 2 | NIR, Red | Early-stage crops, soil-adjusted |
| **GNDVI** | (B8 - B3) / (B8 + B3) | NIR, Green | Chlorophyll density |
| **NBR** | (B8 - B12) / (B8 + B12) | NIR, SWIR22 | Burn ratio, stress detection |

### SAR Fallback Indices
| Index | Formula | Note |
|-------|---------|------|
| NDPI (labelled NDVI) | (VV - VH) / (VV + VH) | Polarization proxy for NDVI |
| EVI (proxy) | NDPI × 0.9 | Mock EVI from SAR |
| NDMI (proxy) | NDPI × 0.8 | Mock NDMI from SAR |

### Cloud Masking
```python
# Sentinel-2 QA60 band bit masking
cloud_bit_mask = 1 << 10    # Opaque clouds
cirrus_bit_mask = 1 << 11   # Cirrus clouds
# Image masked where either bit is set
filter: CLOUDY_PIXEL_PERCENTAGE < 20
```

### Analysis Windows
- **Current:** Last 90 days from today
- **Baseline:** 365–455 days ago (same season last year)
- **Timeline:** Monthly composites over 6 months

### Geographic Input
- User-drawn polygon (Leaflet map) stored as JSON in `Plot.coordinates`
- Polygon normalized and passed to `ee.Geometry.Polygon()`
- Area computed both from GEE (`roi.area()`) and from Shoelace formula (fallback)

### Output
- Current NDVI, EVI, NDMI, NDRE, MSAVI, GNDVI, NBR
- Baseline NDVI, EVI
- 6-month timeline (monthly NDVI + EVI)
- Soil moisture (% vol)
- NDVI thumbnail image URL
- Carbon eligibility score, estimated credits
- Yield prediction

### Simulation Fallback
When GEE is unavailable, a deterministic simulation using `hashlib.md5(seed_string)` generates consistent (but not real) values. The response includes `"status": "simulated"` flag and `"fallback_reason"` field.

---

## PART 8 — SOIL ORGANIC CARBON (SOC)

### Model
`GradientBoostingRegressor` (scikit-learn) trained at startup via `_get_model()`.

### Input Features
| Feature | Description | Source |
|---------|-------------|--------|
| ndvi_avg | Average NDVI (0–1) | GEE Sentinel-2 |
| evi_avg | Average EVI (0–1) | GEE Sentinel-2 |
| moisture_avg | Volumetric soil moisture (%) | NASA SMAP |
| days_enrolled | Days since carbon project enrollment | DB: CarbonProject.start_date |

### Training Data
- **Primary:** CSV at `backend/data/soc_training_data.csv`  
  — Described as ICAR-NBSS district-level SOC survey (Maharashtra)
  — Minimum 20 rows required
- **Fallback (if CSV missing):** 200 synthetic samples using formula:
  `SOC = 12.5 + (NDVI×8 + EVI×4) + (moisture/100×5) + (days/365×2) + N(0, 1.2)`

### Physical Bounds
Output clipped to [10.0, 42.0] t/ha — based on NBSS data for Indian agricultural soils.

### Hyperparameters
n_estimators=150, max_depth=4, learning_rate=0.08, subsample=0.85, random_state=42

### Validation
No separate test split in code. Training R² reported on training set only (not published in project). **R², RMSE, and MAE are not verifiable from project files.**

### VM0042 SOC Stock Formula (physically implemented)
```
SOC_stock (t C/ha) = (SOC% / 100) × Bulk_Density (g/cm³) × Depth_m × 10
Net_change (t C/ha) = SOC_monitoring - SOC_baseline
Total_C (t C) = Net_change × Plot_area (ha)
CO2_equivalent (t CO2e) = Total_C × (44/12)
Buffer_deduction = CO2_equivalent × 15% / 100
Issuable_credits = CO2_equivalent - Buffer_deduction
```
*(Source: `backend/services/vm0042_calculator.py`)*

---

## PART 9 — CARBON CREDIT MODULE

### What the Module Actually Does

The Carbon Vault is an **internal platform-managed** carbon credit system. It is NOT connected to Verra, Gold Standard, or any certified VVB. It implements a **simulated dMRV (digital Measurement, Reporting & Verification) pipeline** that mirrors the structure of real-world carbon standards.

### Carbon Credit Classification: **SIMULATED / ESTIMATED — NOT CERTIFIED**

The platform issues tokens labelled `KD-C-YYYY-NNNNN` (Krishi-Drishti Carbon tokens). These are:
- Internal platform records stored in the `carbon_tokens` SQLite table
- SHA-256 hashed but not anchored to any live public blockchain (Hardhat local only)
- Not verified by any accredited third-party VVB
- Not registered on Verra Registry, Gold Standard Registry, or any national carbon registry

### Data Collected
- Farmer KYC (Aadhaar/ID + land deed)
- GPS-tagged practice photos (uploaded to Cloudinary)
- Soil lab results (SOC%, bulk density, pH, nitrogen)
- Management practice logs (cover crop, no-till, agroforestry events)
- GEE satellite scans (NDVI, EVI, MSAVI per plot)

### Carbon Calculation
Follows IPCC ER formula: `ER = BE - PE - LE`
- **BE (Baseline Emissions):** Satellite NDVI-based SOC change × methodology multiplier
- **PE (Project Emissions):** IPCC Tier 1 diesel emission factor per methodology (Cover-Crop: 8L/ha/yr × 2.68 kgCO₂e/L)
- **LE (Leakage):** 10% of BE (VM0042 §9 smallholder leakage factor)
- **Buffer Pool:** 15% of net ER (Verra permanence buffer)
- **Issuable:** `net_ER × (1 - 0.15)`

### Blockchain Usage
- `CarbonVault.sol` smart contract (Solidity 0.8.20)
- Function: `logEvidence(evidenceId, projectId, evidenceHash)` — stores SHA-256 hash
- Network: Hardhat local (chainId 31337) — **not deployed on mainnet or testnet**
- `MerkleAnchor` table in DB plans daily Merkle root anchoring, but `l2_tx_hash` is nullable (not populated in production)

### Token Retirement
- `CarbonCreditToken.status` lifecycle: Minted → Transferred → Retired
- On retirement: `retirement_hash = SHA-256(retirement data)`, `retirement_certificate_id = KD-RET-YYYY-NNNNN`
- This is an **internal certificate** — not a publicly verifiable offset certificate

### Platform Fee
20% of credit value goes to platform; 80% to farmer (hardcoded in `models.py` properties).

### Reference to Standards
The codebase references: Verra VM0042, IPCC 2006 Guidelines Vol.4, CCTS (Carbon Credit Trading Scheme — India), Gold Standard LUF AGR FM. These are referenced for calculation methodology alignment, but **the project has not undergone any certification by these bodies**.

---

## PART 10 — BIOACOUSTIC MODULE

### Status: B — Partially Implemented (Separate Microservice)

### Audio Input
- Format: `.wav` files
- Collected via: Frontend recording (BioacousticScreen.tsx)
- Transmitted to: Separate FastAPI server on port 8002

### Preprocessing (`model_trainer.py`, `server.py`)
```python
sr = 44100                  # Sample rate (Hz)
n_fft = 1024                # FFT window (ms resolution)
hop_length = 256            # Step size
n_mels = 128                # Mel frequency bands
fmin = 1000                 # Ignore below 1kHz (background noise)
fmax = sr // 2 = 22050      # Nyquist frequency
target_frames = 1723        # ~10 seconds at SR=44100, hop=256
output_shape = (128, 1723, 1)  # Channel-last CNN input
```

### Feature Extraction
Mel-spectrogram → log power conversion (`librosa.power_to_db`) → channel expansion.

### Model Architecture
```
Conv2D(16, 3×3, relu) → MaxPool(2×2)
Conv2D(32, 3×3, relu) → MaxPool(2×2)
Conv2D(64, 3×3, relu) → MaxPool(2×2)
Flatten
Dense(64, relu) → Dropout(0.5)
Dense(1, sigmoid)   ← Binary output
```

### Training Data
- Positive samples: 95 `.wav` files from `insect_sounds/` (labeled A1–I7, likely from academic bioacoustics corpus — filenames suggest standardized test signals)
- Negative samples: Synthetic `np.random.rand(128, 1723, 1) × -80` (random noise)
- Total: ~190 samples (95 positive + up to 95 synthetic negative)
- Epochs: 5, Batch size: 8, Validation split: 20%

### Classification Output
- Binary: pest_detected (True/False)
- Pest type (heuristic, NOT a separate classification model):
  - avg_freq > 5000 Hz → "Cicada / Leafhopper"
  - avg_freq 3000–5000 Hz → "Locust / Cricket"
  - avg_freq 1500–3000 Hz → "Beetle / Weevil"
  - avg_freq < 1500 Hz → "Grub / Stem Borer"

### Integration Status
BioacousticScreen.tsx exists in the frontend. The microservice server.py runs on port 8002 independently. The main FastAPI backend (port 8080) does not proxy to this service. **Not integrated into the main backend.**

### Limitations (Explicitly Stated)
The 95 training samples are insufficient for a production-grade model. The pest-type heuristic using spectral centroid is a simplification — not a multi-class trained classifier. This module is **experimental/prototype**.

---

## PART 11 — MARKETPLACE / MANDI

### Two Separate Marketplaces

#### Marketplace 1: Crop Listings (`/api/market`)

| Field | Description |
|-------|-------------|
| crop_name | Crop being sold |
| quantity | String, e.g., "500kg" |
| price | String, e.g., "120/kg" |
| location | District/city string |
| description | Optional text |
| is_organic | Boolean |
| image_url | Optional URL |
| grade | Default "A" |

- **Authentication:** Required to create (JWT); browsing is open
- **Search/Filter:** By crop name (`ILIKE`) and location (`ILIKE`)
- **Transaction:** None — buyer contacts seller directly via displayed phone number
- **Payment:** Not implemented for crop listings
- **Market price:** Gemini LLM query (not real-time Mandi data feed)

#### Marketplace 2: Carbon Credit Marketplace (`/api/marketplace`)

| Feature | Implementation |
|---------|---------------|
| Listing | Farmer lists verified credits (quantity_tco2e, price_per_tco2e_inr) |
| Browse | Open endpoint — lists active credit listings |
| Purchase | Razorpay order creation (demo mode without keys) |
| Payment verification | HMAC signature verification (`hmac.compare_digest`) |
| Platform fee | 20% deducted automatically |
| Certificate | Retirement certificate (KD-RET-YYYY-NNNNN) generated on successful payment |

---

## PART 12 — GOVERNMENT SCHEMES

### Data Source
Static data seeded into local SQLite `schemes` table. **Not connected to any government API.**

### Schemes Included (seeded defaults — 7 schemes)
1. Pradhan Mantri Fasal Bima Yojana (PMFBY) — tag: URGENT
2. Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) — tag: EXPIRING
3. Paramparagat Krishi Vikas Yojana (PKVY) — tag: NEW
4. PM-Kisan Samman Nidhi — tag: NEW
5. Kisan Credit Card (KCC) — tag: URGENT
6. PM-KUSUM — tag: EXPIRING
7. Soil Health Card Scheme — tag: NEW

### Fields per Scheme
title, description, tag (NEW/EXPIRING/URGENT), deadline, link (external government URL), benefits, eligibility

### Eligibility Matching
No automated eligibility matching in the backend (no AI matcher in backend code). The frontend `GovernmentSchemesScreen.tsx` may implement local filtering — not verifiable from backend alone.

### Application Process
- `POST /api/schemes/apply` creates a `SchemeApplication` record with `status="In Review"` in the local DB.
- **This does NOT submit to any government portal.**
- External government website link is provided for actual application.

---

## PART 13 — WEATHER / FORECASTING

### Weather API
**Open-Meteo** (free, no API key required)

### Current Weather Parameters
temperature_2m, relative_humidity_2m, apparent_temperature, rain, precipitation, weather_code, is_day, wind_speed_10m, wind_direction_10m, surface_pressure, cloud_cover, visibility, uv_index, dew_point_2m, soil_temperature_0cm

### Forecast
- Forecast period: **10 days** (`forecast_days=10`)
- Hourly: temperature, weather_code, precipitation_probability, apparent_temperature, wind_speed, visibility, is_day, relative_humidity
- Daily: weather_code, temp max/min, sunrise/sunset, UV index max, precipitation sum, precipitation probability max, wind speed max, wind gusts max, wind direction dominant

### Air Quality
- Open-Meteo Air Quality API: PM10, PM2.5, CO, NO2, SO2, ozone, US AQI, European AQI, dust, UV index
- AQI categorization: Good (≤50), Moderate (≤100), Unhealthy for Sensitive (≤150), Unhealthy (≤200), Very Unhealthy (≤300), Hazardous (>300)

### Geocoding
- Location search: Open-Meteo Geocoding API
- Reverse geocoding: OSM Nominatim → BigDataCloud fallback

### Disease Risk from Weather
- **Mechanism:** APScheduler daily job calls `evaluate_disease_risk(weather_data, crop_type)` — rule-based, not ML
- **This is NOT an ML weather prediction model**

### Fallback
`weather_response.json` at project root — served when Open-Meteo is unreachable. Contains static sample data dated 2026-08-04.

---

## PART 14 — DATABASE ANALYSIS

**Primary Database:** SQLite (`krishi_drishti.db`, 827 KB at project root)
**ORM:** SQLAlchemy 2.0
**Migration:** Alembic + `safe_migrate()` function for SQLite-compatible column additions

### All Tables (from `backend/models.py`)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `users` | id, phone, name, district, land_size, category, farming_type, language, trust_score, crops, kyc_status | Farmer identity and profile |
| `listings` | id, seller_id, crop_name, quantity, price, location, is_organic, grade, image_url, verified | Crop marketplace listings |
| `chat_messages` | id, user_id, role, text, timestamp | AI chatbot conversation history |
| `stress_reports` | id, user_id, lat, lng, crop_type, ndvi_score, stress_level, recommendation | Crop stress analysis history |
| `scheme_applications` | id, user_id, scheme_id, scheme_name, status, submitted_at, remarks | Internal scheme application records |
| `schemes` | id, title, description, tag, deadline, link, benefits, eligibility | Government scheme information |
| `community_posts` | id, user_id, content, image_url, likes_count | Community feed posts |
| `community_comments` | id, post_id, user_id, text | Post comments |
| `community_likes` | id, post_id, user_id | Post likes |
| `plots` | id, user_id, name, coordinates (JSON), area (acres), crop_type, health_score, moisture, organic_score, carbon_credits, polygon_id, image_url | Farm plot definitions |
| `plot_history` | id, plot_id, date, ndvi, evi, msavi, is_anomaly | Historical satellite scan results |
| `carbon_projects` | id, plot_id, user_id, methodology, status, baseline_emission, projected_sequestration, verified_credits, available_credits, locked_credits, 4 pillar flags, permanence fields, verification_report_url | Carbon project records |
| `carbon_evidence` | id, project_id, image_url, description, geo_lat, geo_lng, evidence_hash, tx_hash, exif_* fields, gps_valid, ai_status, ai_confidence, ai_analysis, review_status, l1/l2 review fields | Evidence photos + verification status |
| `farmer_kyc` | id, user_id, id_type, id_number_masked, id_doc_url, land_deed_url, land_area_acres, kyc_status, submitted_at | KYC identity verification |
| `carbon_transactions` | id, project_id, user_id, amount_credits, amount_inr, aggregator_fee_inr, farmer_payout_inr | Credit transaction history |
| `carbon_tokens` | id, token_id, project_id, user_id, amount (tCO₂e), token_hash, methodology, permanence_years, vintage_year, price_per_tco2e_inr, status, retirement fields | Digital carbon credit tokens |
| `management_practice_logs` | id, plot_id, user_id, project_id, practice_type, event_date, description, photo_url, geo_lat, geo_lng, quantity, unit, fertilizer_type, yield_tonnes_ha | Regenerative practice evidence |
| `soil_sample_records` | id, project_id, user_id, sample_date, depth_cm, lab_name, soc_percent, bulk_density_g_cm3, ph, nitrogen_percent, lab_certificate_url, fraud_flags, satellite_soc_estimate, lab_report_hash | Soil lab test records |
| `farmer_operation_logs` | id, user_id, plot_id, project_id, operation, detail | Immutable audit trail |
| `admin_credit_decisions` | id, project_id, action, credits_issued, rejection_reason, decided_at | Admin approval/rejection records |
| `contracts` | id, farmer_id, buyer_name, crop_type, quantity, price_per_qt, delivery_date, status, terms, digital_signature | Forward contracts |
| `weather_history` | id, plot_id, region, date, temperature_avg, humidity_avg, precipitation | Weather data cache |
| `disease_risk_alerts` | id, plot_id, user_id, disease_name, risk_level, trigger_date, recommendation, is_active | Active disease risk alerts |
| `crop_cycles` | id, plot_id, user_id, crop_type, variety, status, start_date, end_date | Crop cycle records |
| `crop_cycle_events` | id, cycle_id, event_type, event_date, geo_lat, geo_lng, media_url, notes, event_hash | Immutable crop cycle events |
| `harvest_tokens` | id, token_id, plot_id, user_id, carbon_project_id, crop_type, harvest_date, yield_kg, chemical_inputs, token_hash, previous_hash, status, qr_url | Harvest provenance tokens |
| `token_transfer_logs` | id, token_id, from_entity, to_entity, transfer_date, transfer_hash | Transfer custody records |
| `merkle_anchors` | id, anchor_date, merkle_root, event_count, chain_id, l2_tx_hash | Daily Merkle root records |
| `soil_qr_bags` | id, bag_code, plot_id, project_id, user_id, status, sample_record_id | Tamper-evident soil bag QR codes |
| `credit_listings` | id, user_id, project_id, token_id, quantity_tco2e, price_per_tco2e_inr, total_inr, methodology, status | Carbon credit sale listings |
| `credit_purchases` | id, listing_id, buyer_name, buyer_email, buyer_gstin, quantity_tco2e, total_inr, razorpay_order_id, razorpay_payment_id, payment_status, certificate_id | Razorpay purchase records |

**Total tables: 30**

---

## PART 15 — SECURITY

### Authentication
- JWT tokens (HS256) — 3000-minute expiry (50 hours)
- `SECRET_KEY` defaults to `"supersecretkey_change_me_in_prod"` if not set
- No refresh token mechanism

### OTP System (Critical Vulnerabilities)
- OTP hardcoded to `"1234"` (line 26 of `auth.py`)
- Master bypass OTP `"0000"` always accepted
- OTP stored in Python in-memory dict — resets on server restart, no expiry
- No real SMS gateway (Twilio/MSG91 not integrated)

### Authorization
- Route-level: `Depends(get_current_user)` for farmer endpoints
- Admin endpoints: Secret token header (`ADMIN_SECRET_TOKEN`)
- No role-based access control (RBAC) — all authenticated users have same permissions

### Password Handling
- No passwords — phone + OTP only
- `passlib[bcrypt]` is in requirements but not used for any password in inspected code

### API Key Protection
- Gemini API key: stored in `.env` and `backend/.env`
- Cloudinary credentials: stored in `.env`
- Admin token: stored in `.env`, also in `VITE_ADMIN_SECRET_TOKEN` (exposed to frontend build)

> [!CAUTION]
> The `VITE_ADMIN_SECRET_TOKEN` environment variable is prefixed with `VITE_`, which means it is **bundled into the frontend JavaScript build** and visible to any user who inspects the app bundle.

### CORS
- Configured in `main.py` from `CORS_ORIGINS` env var
- Default: `http://localhost:3000,http://localhost:5173`

### Rate Limiting
- slowapi rate limiter on sensitive endpoints:
  - `/api/ai/chat`: 20/minute
  - `/api/ai/diagnose`: 10/minute
  - `/api/ai/analyze/stress`: 10/minute

### Input Validation
- Pydantic v2 for all request bodies
- File type check in bioacoustic service (`.wav` only)
- No SQL injection risk (SQLAlchemy ORM used throughout)

### File Validation
- No MIME type verification beyond content_type check in bioacoustic service
- Cloudinary handles image validation for uploads

### Data Privacy
- ID document numbers stored as last-4-digits only (`id_number_masked`)
- Full ID document stored as Cloudinary URL — not encrypted at rest

---

## PART 16 — TEST CASES

### Required Test Cases (based on implemented features)

| Test ID | Module | Condition | Input | Expected Output | Status |
|---------|--------|-----------|-------|----------------|--------|
| TC-01 | Auth | Valid OTP (1234) | Phone, OTP="1234" | JWT token returned | Requires live app |
| TC-02 | Auth | Master OTP (0000) | Phone, OTP="0000" | JWT token returned | Requires live app |
| TC-03 | Auth | Invalid OTP | Phone, OTP="9999" | HTTP 400, "Invalid OTP" | Requires live app |
| TC-04 | Auth | New user registration | New phone number | User created, JWT returned | Requires live app |
| TC-05 | Profile | Update profile | name, district, crops, land | 200 OK, profile updated in DB | Requires live app |
| TC-06 | Disease | Valid leaf image | Tomato leaf JPEG | Disease name + confidence | Requires live app |
| TC-07 | Disease | Non-leaf image | Random image | Gemini zero-shot result | Requires live app |
| TC-08 | Disease | No Gemini API key | Leaf image | Local model result, Gemini unavailable | Requires live app |
| TC-09 | Chat | Query in English | "wheat pest control?" | Gemini response in English | Requires live app |
| TC-10 | Chat | Query with Hindi language set | "गेहूं में कीट?" | Gemini response in Hindi | Requires live app |
| TC-11 | Weather | Valid GPS | lat=21.14, lng=79.09 | 10-day forecast JSON | Requires live app |
| TC-12 | Weather | Open-Meteo unreachable | Any lat/lng | Fallback weather_response.json served | Requires live app |
| TC-13 | Satellite | Valid plot polygon, GEE auth | Plot with 4+ coordinate points | NDVI/EVI/carbon results | Requires GEE auth |
| TC-14 | Satellite | GEE unavailable | Plot polygon | Simulated results with fallback_reason | Requires backend |
| TC-15 | Satellite | Insufficient coordinates (<4) | 1-point polygon | Simulation triggered | Requires backend |
| TC-16 | Market | Create listing | crop_name, quantity, price | 201 Created, listing in DB | Requires live app |
| TC-17 | Market | Search by crop | crop="wheat" | Filtered listing list | Requires live app |
| TC-18 | Schemes | Get schemes | GET /api/schemes/ | 7 default schemes returned | Requires live app |
| TC-19 | Schemes | Apply | scheme_id, scheme_name | SchemeApplication created in DB | Requires live app |
| TC-20 | Carbon | Enroll without KYC | KYC not submitted | HTTP 400 or rejection | Requires live app |
| TC-21 | Carbon | Upload evidence photo | Geotagged JPEG | AI screen result (passed/flagged/rejected) | Requires Gemini |
| TC-22 | Carbon | VM0042 calculation | Verified baseline + M&R soil samples | issuable_credits computed | Requires backend |
| TC-23 | Bioacoustic | Pest audio | .wav file with insect sounds | pest_detected=True, confidence, pest_type | Requires microservice |
| TC-24 | Bioacoustic | Silence audio | .wav file with silence | pest_detected=False | Requires microservice |
| TC-25 | Bioacoustic | Non-WAV file | .mp3 file | HTTP 400 error | Requires microservice |
| TC-26 | Traceability | Mint harvest token | plot_id, yield_kg, harvest_date | Token minted, KD-HTK-* ID returned | Requires live app |
| TC-27 | Traceability | Public verify | GET /api/trace/verify/{token_id} | Token details (no auth) | Requires live app |
| TC-28 | KYC | Submit documents | ID doc + land deed | FarmerKYC record created, status=Pending | Requires live app |
| TC-29 | Irrigation | Schedule generation | crop=Rice, soil=Black Soil, weather=Rainy | 7-day schedule with irrigation off days | Requires live app |
| TC-30 | Database | SQLite integrity | Concurrent writes | No corruption (check_same_thread=False) | Requires load test |
| TC-31 | Security | Admin token wrong | Invalid admin header | HTTP 401 | Requires live app |
| TC-32 | Rate limit | Chat — 21 requests/min | 21 POST /api/ai/chat | 20th = OK, 21st = HTTP 429 | Requires live app |
| TC-33 | Mobile | Responsive | Device 360px width | No layout overflow | Requires app install |
| TC-34 | API failure | Gemini down | POST /api/ai/chat | Fallback message returned | Requires key invalidation |

---

## PART 17 — PERFORMANCE RESULTS

### RESULTS THAT ARE VERIFIED FROM THE APPLICATION (SOURCE CODE ONLY)

| Metric | Value | Source |
|--------|-------|--------|
| Weather forecast period | 10 days | `weather.py` line 67 |
| SOC bounds | 10.0–42.0 t/ha | `soil_carbon_estimator.py` line 145 |
| Buffer pool deduction | 15% | `gee_service.py` line 19, VM0042 calculator |
| Platform fee | 20% | `models.py` CarbonProject.platform_fee_percentage property |
| Disease risk model window | 5 days (weather) | `disease_risk_model.py` |
| Background anomaly detection | Every 7 days | `main.py` line 274 |
| Background disease forecast | Every 1 day | `main.py` line 275 |
| Bioacoustic training epochs | 5 | `model_trainer.py` line 120 |
| Bioacoustic batch size | 8 | `model_trainer.py` line 120 |
| Bioacoustic training samples | 95 audio files (positive) | `insect_sounds/` directory count |
| JWT token expiry | 3000 minutes (50 hours) | `auth_utils.py` line 10 |
| GEE cloud filter threshold | <20% cloud cover | `gee_service.py` line 190 |
| GEE analysis window (current) | 90 days | `gee_service.py` line 741 |
| GEE analysis window (baseline) | 365–455 days ago | `gee_service.py` lines 742–743 |
| GEE confidence (real) | 0.86 | `gee_service.py` line 530 |
| GEE confidence (simulated) | 0.58 | `gee_service.py` line 530 |
| NDVI eligibility threshold | ≥0.35 | `gee_service.py` line 503 |
| NDVI change threshold for credits | ≥0.03 | `gee_service.py` line 502 |
| Min plot size for project economics | 0.2 ha | `gee_service.py` line 527 |
| Carbon credit price reference | ₹1,200/tCO₂e | `gee_service.py` line 602 |

### RESULTS THAT ARE CLAIMED BUT NOT VERIFIED

| Claim | Status |
|-------|--------|
| MobileNetV2 accuracy | Not verifiable — no training script or evaluation in project |
| EfficientNet accuracy | Not verifiable — model file present but no training evidence |
| SOC model R² / RMSE | Not verifiable — computed at runtime from training set only, not published |
| Yield model R² | Not verifiable — computed at runtime only |
| Bioacoustic model accuracy | Not verifiable — no test set evaluation in code |
| ICAR-NBSS dataset actual sample count | Not verifiable — CSV file not inspected (only referenced) |
| "95% accuracy" or any similar quoted accuracy | **Not found anywhere in the project source code** |

---

## PART 18 — SCREENSHOTS AND FIGURES REQUIRED

| Figure # | Title | Contents | Report Section |
|----------|-------|---------|---------------|
| Fig 1 | System Architecture Diagram | Full tech stack: frontend, backend, ML, APIs, DB | Design Chapter |
| Fig 2 | Database Entity-Relationship (ER) Diagram | All 30 tables and relationships | Database Chapter |
| Fig 3 | Application Landing Screen | SplashScreen + LandingScreen | Implementation Chapter |
| Fig 4 | OTP Authentication Screen | Phone entry + OTP verification | Implementation / Security |
| Fig 5 | Farmer Profile Screen | Profile form with crops, district, language | Implementation |
| Fig 6 | Main Dashboard | Weather widget, alerts, quick-access grid | Implementation |
| Fig 7 | Land Marking (Leaflet Map) | Polygon drawing on satellite map | GIS Module |
| Fig 8 | Crop Health Dashboard | NDVI gauge, timeline chart, carbon score | Remote Sensing / Results |
| Fig 9 | Satellite Monitoring Output | NDVI/EVI/MSAVI values, thumbnail image | Remote Sensing / Results |
| Fig 10 | Disease Detection — Input | Camera/upload interface (VisionScreen) | Disease Module |
| Fig 11 | Disease Detection — Result | Disease name, confidence, remedies list | Disease Module / Results |
| Fig 12 | MobileNetV2 Model Architecture | Diagram of CNN layers | AI/ML Chapter |
| Fig 13 | AI Advisory Chatbot | ChatScreen with multilingual response | AI Module |
| Fig 14 | Weather Forecast Screen | 10-day forecast + AQI | Weather Module |
| Fig 15 | Mandi Direct Marketplace | Crop listings with filter | Marketplace Module |
| Fig 16 | Government Schemes (Scheme Setu) | Scheme list + apply button | Schemes Module |
| Fig 17 | Carbon Vault Enrollment | Methodology selection + NDVI gate | Carbon Module |
| Fig 18 | Evidence Upload + AI Screening | Photo upload with AI verdict | Carbon dMRV |
| Fig 19 | VM0042 Carbon Calculation | ER = BE - PE - LE breakdown | Carbon Theory |
| Fig 20 | Carbon Credit Token | Minted token with hash | Carbon Results |
| Fig 21 | Carbon Credit Marketplace | Listing + Razorpay purchase | Marketplace |
| Fig 22 | Soil Sample Record | SOC%, bulk density, lab cert | Soil / Carbon |
| Fig 23 | SOC Estimator Flow | GEE → NDVI/EVI → GBR → t/ha | SOC Module |
| Fig 24 | Bioacoustic Screen | Audio recording UI | Bioacoustic Module |
| Fig 25 | Mel-Spectrogram Example | Visual spectrogram of pest audio | Bioacoustic Theory |
| Fig 26 | Bioacoustic CNN Architecture | Layer diagram | AI/ML Chapter |
| Fig 27 | CarbonVault.sol Smart Contract | Solidity code screenshot | Blockchain Module |
| Fig 28 | Harvest Token (Traceability) | KD-HTK token with QR code | Traceability |
| Fig 29 | Smart Irrigation Schedule | 7-day schedule output | Irrigation Module |
| Fig 30 | Admin Dashboard | Evidence review queue (L1/L2) | Admin / Security |
| Fig 31 | KYC Submission Screen | Document upload form | KYC Module |
| Fig 32 | Disease Risk Alert | Dashboard alert card | Disease Module |
| Fig 33 | NDVI Timeline Chart | 6-month NDVI trend graph | Remote Sensing |
| Fig 34 | User Workflow Diagram | End-to-end farmer journey | System Design |
| Fig 35 | Carbon Credit Issuance Workflow | Enrollment → Evidence → Verify → Issue | Carbon Design |

---

## PART 19 — NOTE ON FINAL REPORT FORMAT

This audit does not create the final VTU/ICEAS report structure. When the official format is provided, the content in this document can be mapped to:
- Abstract → Use PART 20 summary
- Introduction → Use PART 1 (project identification)
- Literature Review → Not covered in this audit (requires external sources)
- System Design → Use PARTS 4 (architecture), 14 (database)
- Implementation → Use PARTS 2 (workflows), 3 (screens), 15 (security)
- AI/ML → Use PARTS 5, 6, 7, 8, 10
- Carbon Module → Use PART 9
- Marketplace → Use PART 11
- Testing → Use PART 16
- Results → Use PART 17
- Conclusion → Derive from PART 20 limitations and future scope

---

## PART 20 — MASTER PROJECT DOCUMENTATION SUMMARY

### A. Project Title
**Krishi-Drishti**: An AI-Powered Agricultural Platform with Satellite Crop Monitoring, Carbon Credit Management, and Bioacoustic Pest Detection for Indian Farmers.

### B. Problem Statement
Indian small and marginal farmers face: lack of access to precision crop health data, delayed disease detection, inability to participate in carbon credit markets, poor supply chain transparency, limited knowledge of government welfare schemes, and lack of fair-price discovery in local mandis. Krishi-Drishti aims to address these through an integrated mobile platform.

### C. Objectives (as evidenced by implementation)
1. Enable real-time satellite crop monitoring using Google Earth Engine
2. Provide AI-powered disease detection using a trained CNN + Gemini advisory
3. Implement a farmer-facing carbon credit enrollment and issuance system following IPCC/VM0042 methodology
4. Provide a digital crop traceability system using SHA-256 hash chains
5. Enable bioacoustic pest detection using Mel-spectrogram CNN
6. Deliver multilingual agricultural advisory via Gemini chatbot
7. Support government scheme discovery and application tracking

### D. Actual Implemented Modules (25)
Authentication, Farmer Profile, Crop Health Monitoring (GEE), Disease Detection (CNN+LLM), AI Advisory Chatbot, Weather Forecast, Disease Risk Forecasting (scheduler), Carbon Vault (5-pillar dMRV), KYC, Soil Sample Records, Evidence AI Screening, VM0042 Calculator, Carbon Credit Tokens, Carbon Marketplace (Razorpay), SOC Estimator, Yield Predictor, Crop Marketplace (Mandi), Government Schemes, Traceability (Harvest Tokens), Crop Cycles, Smart Irrigation, Bioacoustic Pest Detection (microservice), Supply Chain Contracts, Insurance Schemes, Admin Dashboard.

### E. Technologies
**Frontend:** React 19, TypeScript, Vite 6, TailwindCSS 3, Framer Motion, Leaflet, Capacitor 8 (Android)
**Backend:** Python FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic v2, Celery, Redis, APScheduler
**Database:** SQLite (dev) / PostgreSQL (prod option)
**AI/ML:** Google Gemini, TensorFlow/Keras, scikit-learn
**Satellite:** Google Earth Engine (Sentinel-2, Sentinel-1 SAR, NASA SMAP)
**APIs:** Open-Meteo, OpenStreetMap Nominatim, BigDataCloud, Cloudinary, Razorpay
**Blockchain:** Solidity 0.8.20 (Hardhat), Web3.py
**Mobile:** Capacitor 8 (Android APK)

### F. Architecture
Three-tier: React mobile frontend → FastAPI REST backend → SQLite/PostgreSQL + external APIs + ML models.

### G. Dataset Information
| Dataset | Source | Usage |
|---------|--------|-------|
| Plant disease images (inferred PlantVillage) | Training of mobilenetv2_5_class.h5 | Disease classification |
| ICAR-NBSS SOC survey (Maharashtra) | CSV at `backend/data/soc_training_data.csv` | SOC estimation training |
| ICAR/DES yield statistics 2022-23 | Hardcoded in `yield_predictor.py` | Yield prediction baselines |
| Insect bioacoustic sounds (95 .wav files) | `backend/bioacoustic_service/insect_sounds/` | Bioacoustic model training |
| Synthetic negatives | Programmatically generated | Bioacoustic model balance |

### H. AI/ML Models
1. MobileNetV2 (5-class disease classification, 128×128 input)
2. GradientBoostingRegressor (SOC estimation, 4 features)
3. RandomForestRegressor (Yield prediction, 3 features)
4. Rule-Based Epidemiological Model (Disease risk, ICAR advisory rules)
5. Binary CNN on Mel-spectrogram (Bioacoustic pest detection)
6. Google Gemini (generative advisory, translation, evidence verification)
7. Linear Regression (inline, on-demand SOC calibration from farmer data)

### I. APIs
Google Gemini, Google Earth Engine, Open-Meteo (weather + geocoding + air quality), OpenStreetMap Nominatim, BigDataCloud, Cloudinary, Razorpay

### J. Database
SQLite (30 tables) covering: users, plots, plot history, carbon projects, evidence, tokens, transactions, soil samples, KYC, listings, marketplace, traceability, crop cycles, contracts, insurance, schemes, community, weather, alerts.

### K. Algorithms
- **NDVI:** (NIR - Red) / (NIR + Red)
- **EVI:** 2.5 × ((NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1))
- **MSAVI:** (2×NIR + 1 - √((2×NIR + 1)² - 8×(NIR - Red))) / 2
- **VM0042 ER:** ER_y = BE_y - PE_y - LE_y
- **SOC Stock:** (SOC%/100) × BD × Depth_m × 10
- **C → CO₂e:** C × (44/12)
- **SHA-256 hash chain:** token_hash = sha256(token_id + fields + previous_hash)
- **Spectral centroid:** librosa.feature.spectral_centroid() for pest type
- **Jensen moisture production function:** moisture_effect = 0.60 + exp(-(m - opt)²/(2×18²)) × 0.55

### L. Mathematical Formulas (Key)
```
ER = BE - PE - LE
BE = ΔC_tCO2e/ha × Area × Methodology_multiplier
PE = (Diesel_L/ha × 2.68 kgCO2e/L / 1000) × Area
LE = BE × 0.10
Buffer = Net_ER × 0.15
Issuable = Net_ER - Buffer

SOC_stock (t C/ha) = (SOC%/100) × BD (g/cm³) × Depth (m) × 10
CO2e = C_total × (44/12) = C_total × 3.667

NDVI = (B8 - B4) / (B8 + B4)
EVI = 2.5 × (B8 - B4) / (B8 + 6B4 - 7.5B2 + 1)
GNDVI = (B8 - B3) / (B8 + B3)
NDRE = (B8A - B5) / (B8A + B5)
MSAVI = [2×B8 + 1 - √((2×B8+1)² - 8(B8-B4))] / 2
```

### M. Actual Results
See PART 17. No ML accuracy metrics are verifiable from project files.

### N. Testing
See PART 16 for 34 required test cases. Test execution status requires live application.

### O. Limitations (from code evidence)
1. OTP hardcoded to "1234" — security risk
2. JWT secret not set in production
3. VITE_ADMIN_SECRET_TOKEN exposed in frontend bundle
4. SQLite not suitable for production scale
5. Bioacoustic model trained on only 95 samples — insufficient for production
6. Universal Vision Model class labels are meaningless (folder names)
7. Carbon credits are not certified by any accredited VVB
8. Blockchain is Hardhat local only — no public chain
9. Government scheme applications do not connect to government portals
10. Market price from Gemini LLM — not real-time Mandi data
11. Multilingual static UI: only English and Hindi fully translated
12. Disease detection limited to 5 classes (Pepper, Potato, Tomato subset only)
13. AgroMonitoring API key is empty — polygon_id field non-functional
14. SOC model has no separate validation set in code
15. Bioacoustic microservice not integrated into main backend API

### P. Future Enhancements (implied by partial implementations)
1. Integrate real SMS gateway (Twilio/MSG91) for OTP
2. Expand disease detection to all major Indian crop diseases and more classes
3. Deploy blockchain to Polygon/Base L2 mainnet
4. Connect to real government API (PM-Kisan DBT, PMFBY portal)
5. Integrate real-time Agmarknet/eNAM Mandi price API
6. Train bioacoustic model on larger, India-specific insect dataset
7. Integrate bioacoustic microservice into main backend
8. Complete multilingual static UI (Marathi, Tamil, Telugu, Bengali, Kannada, Punjabi)
9. Obtain VVB accreditation for carbon credit scheme
10. Move to PostgreSQL for production deployment
11. Cloud hosting setup (Render/AWS/GCP)
12. Push notifications for disease risk alerts
13. Expand Universal Vision Model with proper class labels

### Q. Required Screenshots
See PART 18 — 35 figures identified.

### R. Required Diagrams
1. System Architecture (3-tier)
2. ER Diagram (30 tables)
3. Carbon Credit Workflow (enrollment to issuance)
4. Farmer User Journey Flow
5. Disease Detection Flow (CNN → Gemini)
6. GEE Satellite Analysis Flow
7. VM0042 Carbon Calculation Diagram
8. Bioacoustic Pipeline Diagram
9. Hash Chain / Traceability Token Diagram
10. Database Schema (key tables)

### S. Missing Information (Not Verifiable from Project Files)
1. Actual accuracy, precision, recall, F1 of MobileNetV2 model
2. Actual accuracy of bioacoustic CNN
3. Training script for MobileNetV2 (not in project)
4. ICAR-NBSS CSV file actual row count
5. SOC model R², RMSE, MAE (reported at runtime but not published)
6. Whether Google Earth Engine is authenticated and working on the developer's machine
7. Whether Razorpay live keys are configured
8. EfficientNet model usage (file present but not called in inspected code)

### T. Claims Requiring Verification
1. Any quoted accuracy percentage for disease detection
2. ICAR-NBSS dataset "real data" claim — CSV file was not inspected, only referenced
3. "Verra VM0042 compliant" — calculation structure follows it, but no certification
4. Carbon credit price of ₹1,200/tCO₂e — hardcoded, not from market feed

### U. Potential Mistakes Found in Existing Documentation
1. If any documentation describes the Universal Vision Model for disease detection: the class labels are Windows folder names, not disease names
2. If any documentation describes OTP as "secure": it is hardcoded and has a master bypass
3. If any documentation claims "real blockchain on public network": the blockchain is Hardhat local only
4. If any documentation claims "government application submission": the app only creates internal records and links to government websites
5. If any documentation describes the disease risk model as "ML": it is a rule-based system, not trained ML
6. If any documentation states "AI market prices": prices come from Gemini's training data, not live Mandi feeds

### V. Recommended Corrections
1. Describe OTP as "Simulated OTP Authentication" or "Demo OTP" in the report
2. Clearly label carbon credits as "Platform-estimated credits, not yet certified by accredited VVB"
3. Clearly label blockchain as "Application-layer hash chain with local Hardhat prototype, not deployed on public chain"
4. Describe government schemes module as "Scheme information and internal application tracking — external application via government portal"
5. Describe bioacoustic module as "Experimental prototype — separate microservice"
6. Describe market prices as "AI-generated price estimates from Gemini LLM (not real-time Mandi data)"
7. Clarify the disease risk model as "Rule-Based Epidemiological Model (ICAR advisory-based)" — not trained ML

### W. Evidence Available for Each Major Claim

| Claim | Evidence Source |
|-------|----------------|
| Disease detection using MobileNetV2 | `backend/routers/ai_chat.py` lines 589–607, model file `mobilenetv2_5_class.h5` |
| Gemini used for advisory | `backend/routers/ai_chat.py` line 702, `backend/routers/translate.py` |
| GEE used for NDVI/EVI | `backend/services/gee_service.py` lines 186–193 |
| SMAP for soil moisture | `backend/services/gee_service.py` lines 242–272 |
| VM0042 methodology | `backend/services/vm0042_calculator.py` |
| CarbonVault smart contract | `backend/blockchain/contracts/CarbonVault.sol` |
| Bioacoustic CNN | `backend/bioacoustic_service/model_trainer.py`, `server.py` |
| SQLite database with 30 tables | `backend/models.py` |
| OTP authentication | `backend/routers/auth.py` |
| JWT tokens | `backend/auth_utils.py` |
| Razorpay integration | `backend/routers/marketplace.py` lines 32–34, `requirements.txt` |
| Multilingual support (partial) | `translations.ts` lines 197–206 |
| Open-Meteo weather | `backend/routers/weather.py` lines 62–69 |
| Rule-based disease risk model | `backend/ml_models/disease_risk_model.py` lines 1–12 |
| SOC GradientBoosting | `backend/ml_models/soil_carbon_estimator.py` |
| Yield RandomForest | `backend/ml_models/yield_predictor.py` |
| Capacitor Android | `capacitor.config.ts`, `android/` directory |
| Cloudinary integration | `backend/.env`, `backend/services/upload_service.py` |

---

*End of Krishi-Drishti Technical Project Audit — All findings based on direct source code inspection.*
