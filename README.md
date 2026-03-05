# waterpath-ke

**WaterPath Kenya** — A community water access and infrastructure reporting platform for North Eastern Kenya.

Built to help women and communities in Turkana, Mandera, Wajir, Garissa, Marsabit, and Isiolo find safe water points, report broken infrastructure, and hold county officials accountable in real time.

---

## What It Does

**Community App (React)**
- Locate the nearest functional borehole using real GPS data
- View water quality classifications (drinkable / brackish / saline)
- Report broken infrastructure anonymously in 3 steps
- Track report status and resolution

**NGO / County Dashboard (React)**
- Receive community reports in real time via Firebase
- Dispatch repair teams via SMS (Africa's Talking)
- Monitor infrastructure status across all water points
- Export reports for donor accountability

**ML Layer (Python / scikit-learn)**
- Predict water quality for unmeasured boreholes using spatial interpolation
- Risk scoring for borehole failure prediction
- Optimal siting recommendations for desalination units

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React + Tailwind + Leaflet.js        |
| Backend     | Python + Flask                      |
| Database    | Firebase Firestore (real-time)      |
| Auth        | Firebase Authentication             |
| SMS / USSD  | Africa's Talking API                |
| ML          | scikit-learn + pandas               |
| Hosting     | Vercel (frontend) + Railway (backend)|

---

## Data Source

Borehole data sourced from **Rural Focus Ltd / Water Resources Authority Kenya** — 1,062 boreholes across Turkana County with GPS coordinates, water quality (EC/pH), depth, and yield data.

---

## Project Structure

```
waterpath-ke/
├── backend/                  # Python Flask API
│   ├── app.py                # Entry point
│   ├── config.py             # Firebase + env config
│   ├── requirements.txt
│   ├── routes/
│   │   ├── water_points.py   # Water point CRUD + querying
│   │   ├── reports.py        # Community report endpoints
│   │   └── auth.py           # NGO auth endpoints
│   ├── models/
│   │   ├── water_point.py    # WaterPoint dataclass
│   │   └── report.py         # Report dataclass
│   ├── ml/
│   │   ├── quality_predictor.py   # EC/salinity prediction model
│   │   ├── risk_scorer.py         # Borehole failure risk scoring
│   │   └── train.py               # Model training scripts
│   ├── utils/
│   │   ├── sms.py            # Africa's Talking SMS wrapper
│   │   └── geo.py            # Distance + geospatial helpers
│   └── scripts/
│       └── seed_firestore.py # Import borehole CSV → Firestore
│
├── frontend/                 # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/          # Leaflet map components
│   │   │   ├── reports/      # Report flow components
│   │   │   ├── dashboard/    # NGO dashboard components
│   │   │   └── shared/       # Badges, cards, buttons
│   │   ├── pages/            # Route-level page components
│   │   ├── hooks/            # Custom React hooks (useFirestore, useLocation)
│   │   └── lib/
│   │       ├── firebase.js   # Firebase initialisation
│   │       └── api.js        # Flask API client
│   └── ...
│
├── data/
│   └── waterpath_boreholes.json   # Cleaned borehole seed data (60 records)
│
└── docs/
    ├── ARCHITECTURE.md
    └── API.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Firebase project (Firestore + Auth enabled)
- Africa's Talking account (for SMS)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/waterpath-ke.git
cd waterpath-ke
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your Firebase + AT credentials
python scripts/seed_firestore.py  # Import borehole data
python app.py
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env.local      # Fill in Firebase config
npm run dev
```

---

## Environment Variables

### Backend `.env`
```
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
AFRICASTALKING_API_KEY=your_key
AFRICASTALKING_USERNAME=your_username
FLASK_ENV=development
PORT=5000
```

### Frontend `.env.local`
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:5000
```

---

## Contributing

This project is built to serve communities in North Eastern Kenya. If you work in WASH, GIS, or community development in the region, contributions and partnerships are welcome.

---

## Data Credits

- Borehole data: Rural Focus Ltd / Water Resources Authority Kenya
- Drought data: National Drought Management Authority (NDMA) Kenya
- Administrative boundaries: GADM / Kenya Open Data

## License

MIT
