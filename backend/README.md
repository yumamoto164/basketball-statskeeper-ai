# Backend

This folder contains the backend agentic code for the Basketball Stats Keeper AI application, built with Python.

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Create a virtual environment (recommended):

```bash
python -m venv venv
```

2. Activate the virtual environment:

   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

## Development

Run the backend server:

```bash
python src/main.py
```

Or using the module syntax:

```bash
python -m src.main
```

## Project Structure

```
backend/
  src/
    main.py          # Main entry point
  requirements.txt   # Python dependencies
  README.md
  venv/             # Virtual environment (gitignored)
```

## Environment Variables

Create a `.env` file in the backend directory for environment-specific configuration:

```env
# Example:
# PORT=8000
# DEBUG=True
```

## Adding Dependencies

When adding new Python packages, update `requirements.txt`:

```bash
pip install <package-name>
pip freeze > requirements.txt
```
