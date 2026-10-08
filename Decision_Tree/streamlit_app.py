import os
import joblib
import pandas as pd
import streamlit as st

st.set_page_config(
    page_title="Student Placement Predictor",
    page_icon="🎓",
    layout="wide"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "placement_model.joblib")
columns_path = os.path.join(BASE_DIR, "columns.joblib")


@st.cache_resource
def load_artifacts():
    m = joblib.load(model_path)
    c = joblib.load(columns_path)
    return m, c


try:
    model, columns = load_artifacts()
except Exception as e:
    st.error(f"Error loading model artifacts: {e}")
    st.stop()

st.title("🎓 Student Placement Prediction")
st.markdown("Predict the likelihood of student placement using a **Decision Tree Classifier**.")

col_left, col_right = st.columns([3, 2], gap="large")

with col_left:
    st.subheader("📋 Student Profile Inputs")

    c1, c2, c3 = st.columns(3)
    with c1:
        gender = st.selectbox("Gender", ["Male", "Female"])
    with c2:
        branch = st.selectbox("Branch", ["CSE", "IT", "ECE", "MECHANICAL", "CIVIL", "COMMERCE"])
    with c3:
        extracurricular = st.selectbox("Extracurricular Activities", ["Yes", "No"])

    st.markdown("---")
    st.write("**Daily Routine & Study Habits**")
    c4, c5, c6 = st.columns(3)
    with c4:
        study_hours = st.slider("Study Hours / Day", 0.0, 14.0, 6.0, 0.5)
    with c5:
        sleep_hours = st.slider("Sleep Hours / Day", 3.0, 12.0, 7.0, 0.5)
    with c6:
        internet_usage = st.slider("Internet Usage (hrs/day)", 0.0, 14.0, 3.0, 0.5)

    st.markdown("---")
    st.write("**Academic Performance**")
    c7, c8 = st.columns(2)
    with c7:
        attendance = st.slider("Attendance Rate (%)", 0.0, 100.0, 85.0, 1.0)
        previous_score = st.slider("Previous Semester Score (%)", 0.0, 100.0, 75.0, 0.5)
    with c8:
        assignments_completed = st.number_input("Assignments Completed", 0, 20, 8, 1)
        exam_score = st.slider("Final Exam Score (%)", 0.0, 100.0, 78.0, 0.5)

    predict_btn = st.button("🚀 Predict Placement", type="primary", use_container_width=True)

with col_right:
    st.subheader("📊 Prediction Outcome")
    if predict_btn:
        gender_num = 1 if gender.lower() == "male" else 0
        extra_num = 1 if extracurricular.lower() == "yes" else 0
        branch_str = branch.strip().upper()

        input_df = pd.DataFrame([{
            "gender": gender_num,
            "branch": branch_str,
            "study_hours": study_hours,
            "attendance": attendance,
            "sleep_hours": sleep_hours,
            "internet_usage": internet_usage,
            "assignments_completed": assignments_completed,
            "previous_score": previous_score,
            "extracurricular": extra_num,
            "exam_score": exam_score
        }])

        input_df = pd.get_dummies(input_df, columns=["branch"], dtype=int)
        input_df = input_df.reindex(columns=columns, fill_value=0)

        prediction = int(model.predict(input_df)[0])
        probabilities = model.predict_proba(input_df)[0] if hasattr(model, "predict_proba") else None

        prob_placed = probabilities[1] * 100 if probabilities is not None else (100.0 if prediction == 1 else 0.0)

        if prediction == 1:
            st.success("### 🎉 Prediction: Placed")
            st.metric("Placement Likelihood", f"{prob_placed:.1f}%")
            st.progress(prob_placed / 100)
            st.info("The student has strong metrics and high probability of campus placement.")
        else:
            st.error("### ⚠️ Prediction: Not Placed / At Risk")
            st.metric("Placement Likelihood", f"{prob_placed:.1f}%")
            st.progress(prob_placed / 100)
            st.warning("The student may require extra mentoring, interview prep, and academic support.")

        st.markdown("#### 💡 Key Observations")
        if attendance < 75:
            st.write(f"- ⚠️ **Attendance is low ({attendance}%)**: Recommended minimum is 75%.")
        if study_hours < 4:
            st.write(f"- ⚠️ **Study hours ({study_hours}h)**: Recommended to increase daily focus.")
        if exam_score >= 80:
            st.write(f"- ✅ **High Exam Score ({exam_score}%)**: Strong competitive advantage.")
    else:
        st.info("Adjust the inputs on the left and click **Predict Placement** to evaluate the student.")

