import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

app= FastAPI()

model = joblib.load("placement_model.joblib")
columns=joblib.load("columns.joblib")



class StudentData(BaseModel):
    student_id: int
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


