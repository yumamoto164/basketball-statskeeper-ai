# Basketball Statskeeper AI

A monorepo for a basketball statskeeper application with a React frontend and agentic AI backend.

## Project Structure

```
basketball-statskeeper-ai/
├── frontend/          # React + TypeScript frontend application
├── backend/           # Backend agentic code
└── package.json       # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js and npm (for frontend)
- Python 3.8+ and pip (for backend)

### Install All Dependencies

**Frontend (Node.js):**

```sh
npm run install:all
```

**Backend (Python):**

```sh
npm run install:backend
```

Or install individually:

```sh
# Frontend
npm install                    # Root dependencies
npm install --workspace=frontend

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Development

Run both frontend and backend:

```sh
npm run dev
```

Or run individually:

```sh
npm run dev:frontend    # Frontend only (http://localhost:5173)
npm run dev:backend     # Backend only (Python)
```

### Building

Build the frontend:

```sh
npm run build:frontend
```

## Frontend

The frontend is a React + TypeScript application built with Vite.

- Enter team players and numbers for home and away teams
- Collect stats (points, assists, rebounds) for each player during a game
- (Planned) Integrate voice-to-text AI for automatic stat recording via voice input

See `frontend/README.md` for more details.

## Backend

The backend is built with Python and contains the agentic AI code for processing and managing basketball statistics.

See `backend/README.md` for more details.

---

This project uses npm workspaces for frontend monorepo management and Python for the backend.
