import os
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Student Placement Prediction API")

# Allow CORS for local and web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

# Mount static files directory
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Load model and feature column names
model_path = os.path.join(BASE_DIR, "placement_model.joblib")
columns_path = os.path.join(BASE_DIR, "columns.joblib")

model = joblib.load(model_path)
columns = joblib.load(columns_path)


class StudentData(BaseModel):
    gender: str
    branch: str
    study_hours: float
    attendance: float
    sleep_hours: float
    internet_usage: float
    assignments_completed: int
    previous_score: float
    extracurricular: str
    exam_score: float


@app.get("/", response_class=HTMLResponse)
def read_root():
    template_path = os.path.join(templates_dir, "index.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Placement Prediction API</h1><p>Send POST requests to /predict</p>")


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "features": columns
    }


@app.post("/predict")
def predict(data: StudentData):
    gender = 1 if data.gender.strip().lower() == "male" else 0
    extra = 1 if data.extracurricular.strip().lower() == "yes" else 0
    branch = data.branch.strip().upper()

    input_data = pd.DataFrame([{
        "gender": gender,
        "branch": branch,
        "study_hours": data.study_hours,
        "attendance": data.attendance,
        "sleep_hours": data.sleep_hours,
        "internet_usage": data.internet_usage,
        "assignments_completed": data.assignments_completed,
        "previous_score": data.previous_score,
        "extracurricular": extra,
        "exam_score": data.exam_score
    }])

    # One-hot encode branch
    input_data = pd.get_dummies(
        input_data,
        columns=["branch"],
        dtype=int
    )

    # Reindex columns to match the training data
    input_data = input_data.reindex(
        columns=columns,
        fill_value=0
    )

    # Model prediction
    prediction = int(model.predict(input_data)[0])
    result = "Placed" if prediction == 1 else "Not Placed"

    # Probability estimation
    prob_placed = 100.0 if prediction == 1 else 0.0
    prob_not_placed = 0.0 if prediction == 1 else 100.0
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(input_data)[0]
        prob_not_placed = round(float(probabilities[0]) * 100, 2)
        prob_placed = round(float(probabilities[1]) * 100, 2)

    return {
        "placement_prediction": result,
        "prediction_code": prediction,
        "probability_placed": prob_placed,
        "probability_not_placed": prob_not_placed
    }