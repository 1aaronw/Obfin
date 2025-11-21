# Obfin - Personal Finance

## Development Setup Guide

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/obfin.git
cd obfin
```

### 2. Install Dependencies
```bash
npm install

cd backend && npm install
cd ../frontend && npm install

cd ../
```

### 3. Environment Setup

Copy and configure **all** referenced config files:
```bash
# Environment variables templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Firebase Admin SDK template
cp backend/config/serviceAccountKey.example.json backend/config/serviceAccountKey.json
```

**Edit files:**
- `backend/.env`: add GEMINI_API_KEY
- `frontend/.env.local`: Firebase web app config
- `backend/config/serviceAccountKey.json`: replace ALL contents with your downloaded Firebase Admin private key JSON

**Firebase Admin Setup:**
1. Firebase Console -> Project Settings -> Service Accounts
2. Generate new private key -> Download JSON file
3. Paste entire JSON contents into `backend/config/serviceAccountKey.json` (overwriting template)

### 4. Development Commands
Run these in **separate terminals** from project root:
```bash
npm run backend-dev # backend dev server w/ nodemon
npm run frontend-start # frontend dev server w/ react-scripts
```

### 5. Production Build and Run
```bash
npm run frontend-build # optimized for production
npm run backend-start # no debug tools
```

### 6. Formatting and Linting
```bash
npm run format
npm run eslint
```