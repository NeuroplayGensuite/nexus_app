"""
NeuroGen Suite — ML Inference Service
FastAPI service that loads the five trained scikit-learn Logistic Regression
.pkl pipelines once at startup and serves predictions via POST /predict.

All five models use the schema:
  - sklearn.Pipeline with steps: preprocessor (ColumnTransformer) + classifier (LogisticRegression)
  - classes_: [0, 1]  (0 = no-risk, 1 = at-risk; encoded from risk_group column)
  - predict_proba() is available on all pipelines

Run from project root:
    cd ml/api
    uvicorn main:app --reload --port 8000

Or directly:
    python -m uvicorn ml.api.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# Resolve paths relative to this file so the service can be launched from any CWD
SERVICE_DIR = Path(__file__).resolve().parent
MODELS_DIR = SERVICE_DIR.parent / "models"

CONDITION_MODEL_MAP: Dict[str, Path] = {
    "dyslexia": MODELS_DIR / "dyslexia.pkl",
    "dysgraphia": MODELS_DIR / "dysgraphia.pkl",
    "dyscalculia": MODELS_DIR / "dyscalculia.pkl",
    "dyspraxia": MODELS_DIR / "dyspraxia.pkl",
    "nvld": MODELS_DIR / "nvld.pkl",
}

# ---------------------------------------------------------------------------
# Feature schemas — must match EXACTLY the column order/names used during training
# Numeric features are imputed with median inside the pipeline.
# Categorical features are mode-imputed then one-hot encoded inside the pipeline.
# ---------------------------------------------------------------------------
FEATURE_SCHEMAS: Dict[str, Dict[str, list]] = {
    "dyslexia": {
        "numeric": [
            "age", "phonicDelay", "phonemicSlips", "totalAttempts", "accuracy",
            "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
            "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs",
        ],
        "categorical": ["cameraAvailable"],
    },
    "dysgraphia": {
        "numeric": [
            "age", "mse", "wallCollisions", "proximityEvents", "wallHuggingRatio",
            "jerkMean", "jerkVariance", "tremorIndicator",
            "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
            "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs",
        ],
        "categorical": ["cameraAvailable"],
    },
    "dyscalculia": {
        "numeric": [
            "age", "subitizingThreshold", "symbolicMappingSpeed", "symbolicMappingErrors",
            "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
            "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs",
        ],
        # NOTE: subitizingFailed is categorical (boolean as string "True"/"False")
        "categorical": ["subitizingFailed", "cameraAvailable"],
    },
    "dyspraxia": {
        "numeric": [
            "age", "motorLag", "gazeEntropy", "rhythmAccuracy", "missedBeats",
            "totalAttempts", "accuracy",
            "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
            "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs",
        ],
        "categorical": ["cameraAvailable"],
    },
    "nvld": {
        "numeric": [
            "age", "spatialDecay1s", "spatialDecay3s", "spatialDecay5s",
            "visualMemoryScore", "totalAttempts", "accuracy",
            "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
            "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs",
        ],
        "categorical": ["cameraAvailable"],
    },
}

# Human-readable risk labels for class indices
RISK_LABELS = {0: "low_risk", 1: "at_risk"}

# ---------------------------------------------------------------------------
# App + model registry
# ---------------------------------------------------------------------------
app = FastAPI(
    title="NeuroGen Suite — ML Inference Service",
    description=(
        "Serves predictions from five scikit-learn Logistic Regression pipelines trained "
        "for behavioral screening in NeuroGen Suite. "
        "This is a research/college prototype, NOT a clinically validated diagnostic system."
    ),
    version="1.0.0",
)

# Allow Next.js dev server to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Model registry — populated at startup
_models: Dict[str, Any] = {}


@app.on_event("startup")
def load_models() -> None:
    """Load all .pkl pipelines once at startup. Fail loudly if any are missing."""
    for condition, model_path in CONDITION_MODEL_MAP.items():
        if not model_path.exists():
            print(f"[WARN] model file not found: {model_path}", file=sys.stderr)
            continue
        try:
            pipeline = joblib.load(model_path)
            _models[condition] = pipeline
            clf = pipeline.named_steps.get("classifier")
            clf_type = type(clf).__name__ if clf else "Unknown"
            print(f"[OK] Loaded {condition}.pkl -- {clf_type}")
        except Exception as exc:
            print(f"[FAIL] Failed to load {condition}.pkl: {exc}", file=sys.stderr)

    print(f"\nNeuroGen ML Service ready. Loaded models: {sorted(_models.keys())}\n")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    condition: str
    features: Dict[str, Any]

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        allowed = set(CONDITION_MODEL_MAP.keys())
        if v not in allowed:
            raise ValueError(f"Unknown condition '{v}'. Must be one of: {sorted(allowed)}")
        return v


class DataQuality(BaseModel):
    cameraAvailable: bool
    numericFeaturesProvided: int
    numericFeaturesTotal: int
    assessmentCompleteness: float  # 0.0–1.0
    missingFeatures: list[str]


class PredictResponse(BaseModel):
    condition: str
    prediction: int          # Raw class index: 0 or 1
    riskLabel: str           # "low_risk" or "at_risk"
    riskProbability: float   # Probability for class 1 (at_risk), 0.0–1.0
    probabilities: Dict[str, float]  # {"low_risk": 0.28, "at_risk": 0.72}
    modelType: str
    modelFile: str
    dataQuality: DataQuality


# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------
@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    condition = request.condition
    raw_features = request.features

    if condition not in _models:
        raise HTTPException(
            status_code=503,
            detail=f"Model for '{condition}' is not loaded. Check server logs.",
        )

    schema = FEATURE_SCHEMAS[condition]
    numeric_cols = schema["numeric"]
    categorical_cols = schema["categorical"]
    all_cols = numeric_cols + categorical_cols

    # -------------------------------------------------------------------
    # Build feature row as a DataFrame — matching training column order
    # -------------------------------------------------------------------
    row: Dict[str, Any] = {}
    missing_features: list[str] = []

    for col in numeric_cols:
        val = raw_features.get(col)
        if val is None:
            # None/null from frontend → NaN for imputer
            row[col] = np.nan
            missing_features.append(col)
        else:
            row[col] = float(val)

    for col in categorical_cols:
        val = raw_features.get(col)
        if val is None:
            row[col] = np.nan
            missing_features.append(col)
        else:
            # Always store as string ("True"/"False") matching training encoding
            row[col] = str(val)

    df = pd.DataFrame([row], columns=all_cols)

    # -------------------------------------------------------------------
    # Run inference
    # -------------------------------------------------------------------
    pipeline = _models[condition]

    try:
        prediction_arr = pipeline.predict(df)
        proba_arr = pipeline.predict_proba(df)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed for '{condition}': {str(exc)}",
        )

    predicted_class = int(prediction_arr[0])
    # Classes are always [0, 1]; proba_arr[:,0] = P(class 0), proba_arr[:,1] = P(class 1)
    prob_no_risk = float(proba_arr[0][0])
    prob_at_risk = float(proba_arr[0][1])

    # -------------------------------------------------------------------
    # Data quality assessment
    # -------------------------------------------------------------------
    camera_available = str(raw_features.get("cameraAvailable", "False")).lower() == "true"
    numeric_provided = sum(
        1 for col in numeric_cols if raw_features.get(col) is not None
    )
    completeness = numeric_provided / max(len(numeric_cols), 1)

    clf = pipeline.named_steps.get("classifier")
    model_type = type(clf).__name__ if clf else "Unknown"

    return PredictResponse(
        condition=condition,
        prediction=predicted_class,
        riskLabel=RISK_LABELS[predicted_class],
        riskProbability=round(prob_at_risk, 4),
        probabilities={
            "low_risk": round(prob_no_risk, 4),
            "at_risk": round(prob_at_risk, 4),
        },
        modelType=model_type,
        modelFile=f"{condition}.pkl",
        dataQuality=DataQuality(
            cameraAvailable=camera_available,
            numericFeaturesProvided=numeric_provided,
            numericFeaturesTotal=len(numeric_cols),
            assessmentCompleteness=round(completeness, 3),
            missingFeatures=missing_features,
        ),
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "loadedModels": sorted(_models.keys()),
        "expectedModels": sorted(CONDITION_MODEL_MAP.keys()),
        "allModelsLoaded": sorted(_models.keys()) == sorted(CONDITION_MODEL_MAP.keys()),
    }
