"""
NeuroGen Suite — Model Verification Script

Run from project root to verify all .pkl models load and produce valid predictions:
    python ml/api/verify_models.py

Checks:
  - All 5 models load without error
  - Each model produces a valid prediction and probability vector
  - Class labels match expected [0, 1]
  - predict_proba() is available and sums to ~1.0
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "ml" / "api"))

try:
    import joblib
    import pandas as pd
except ImportError as e:
    print(f"FAIL: Missing dependency — {e}")
    print("Run: pip install joblib pandas scikit-learn")
    sys.exit(1)

MODELS_DIR = PROJECT_ROOT / "ml" / "models"

# Minimal valid feature rows per condition — uses None for optional CV fields
# to test imputer behaviour when camera is unavailable
SAMPLE_INPUTS = {
    "dyslexia": {
        "age": 9,
        "phonicDelay": 2100.0,
        "phonemicSlips": 2.0,
        "totalAttempts": 10.0,
        "accuracy": 0.75,
        # CV available
        "faceDetectedRatio": 0.85,
        "onScreenEngagementRatio": 0.80,
        "lookingAwayEvents": 3.0,
        "totalLookingAwayDurationMs": 4500.0,
        "averageLookingAwayDurationMs": 1500.0,
        "trackingDurationMs": 120000.0,
        "cameraAvailable": "True",
    },
    "dyslexia_no_camera": {
        "age": 9,
        "phonicDelay": 2100.0,
        "phonemicSlips": 2.0,
        "totalAttempts": 10.0,
        "accuracy": 0.75,
        # CV unavailable — None becomes NaN, imputed by pipeline
        "faceDetectedRatio": None,
        "onScreenEngagementRatio": None,
        "lookingAwayEvents": None,
        "totalLookingAwayDurationMs": None,
        "averageLookingAwayDurationMs": None,
        "trackingDurationMs": 0.0,
        "cameraAvailable": "False",
    },
    "dysgraphia": {
        "age": 10,
        "mse": 85.0,
        "wallCollisions": 40.0,
        "proximityEvents": 60.0,
        "wallHuggingRatio": 0.67,
        "jerkMean": 0.9,
        "jerkVariance": 1400000000000.0,
        "tremorIndicator": 30.0,
        "faceDetectedRatio": 0.9,
        "onScreenEngagementRatio": 0.85,
        "lookingAwayEvents": 2.0,
        "totalLookingAwayDurationMs": 2000.0,
        "averageLookingAwayDurationMs": 1000.0,
        "trackingDurationMs": 90000.0,
        "cameraAvailable": "True",
    },
    "dyscalculia": {
        "age": 8,
        "subitizingThreshold": 0.0,          # Test: zero threshold (task failure)
        "symbolicMappingSpeed": 5186.0,
        "symbolicMappingErrors": 4.0,
        "faceDetectedRatio": 0.88,
        "onScreenEngagementRatio": 0.82,
        "lookingAwayEvents": 5.0,
        "totalLookingAwayDurationMs": 6000.0,
        "averageLookingAwayDurationMs": 1200.0,
        "trackingDurationMs": 100000.0,
        "subitizingFailed": "True",           # Categorical string
        "cameraAvailable": "True",
    },
    "dyspraxia": {
        "age": 11,
        "motorLag": 950.0,
        "gazeEntropy": 0.72,
        "rhythmAccuracy": 0.55,
        "missedBeats": 8.0,
        "totalAttempts": 20.0,
        "accuracy": 0.6,
        "faceDetectedRatio": 0.79,
        "onScreenEngagementRatio": 0.75,
        "lookingAwayEvents": 6.0,
        "totalLookingAwayDurationMs": 7000.0,
        "averageLookingAwayDurationMs": 1166.0,
        "trackingDurationMs": 110000.0,
        "cameraAvailable": "True",
    },
    "nvld": {
        "age": 10,
        "spatialDecay1s": 0.72,
        "spatialDecay3s": 0.51,
        "spatialDecay5s": 0.38,
        "visualMemoryScore": 55.0,
        "totalAttempts": 15.0,
        "accuracy": 0.65,
        "faceDetectedRatio": 0.92,
        "onScreenEngagementRatio": 0.88,
        "lookingAwayEvents": 2.0,
        "totalLookingAwayDurationMs": 1800.0,
        "averageLookingAwayDurationMs": 900.0,
        "trackingDurationMs": 95000.0,
        "cameraAvailable": "True",
    },
}

FEATURE_SCHEMAS = {
    "dyslexia": {
        "numeric": ["age", "phonicDelay", "phonemicSlips", "totalAttempts", "accuracy",
                    "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
                    "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs"],
        "categorical": ["cameraAvailable"],
    },
    "dysgraphia": {
        "numeric": ["age", "mse", "wallCollisions", "proximityEvents", "wallHuggingRatio",
                    "jerkMean", "jerkVariance", "tremorIndicator",
                    "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
                    "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs"],
        "categorical": ["cameraAvailable"],
    },
    "dyscalculia": {
        "numeric": ["age", "subitizingThreshold", "symbolicMappingSpeed", "symbolicMappingErrors",
                    "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
                    "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs"],
        "categorical": ["subitizingFailed", "cameraAvailable"],
    },
    "dyspraxia": {
        "numeric": ["age", "motorLag", "gazeEntropy", "rhythmAccuracy", "missedBeats",
                    "totalAttempts", "accuracy",
                    "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
                    "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs"],
        "categorical": ["cameraAvailable"],
    },
    "nvld": {
        "numeric": ["age", "spatialDecay1s", "spatialDecay3s", "spatialDecay5s",
                    "visualMemoryScore", "totalAttempts", "accuracy",
                    "faceDetectedRatio", "onScreenEngagementRatio", "lookingAwayEvents",
                    "totalLookingAwayDurationMs", "averageLookingAwayDurationMs", "trackingDurationMs"],
        "categorical": ["cameraAvailable"],
    },
}

RISK_LABELS = {0: "low_risk", 1: "at_risk"}


def build_df(condition: str, raw: dict) -> pd.DataFrame:
    schema = FEATURE_SCHEMAS[condition]
    all_cols = schema["numeric"] + schema["categorical"]
    row = {}
    for col in schema["numeric"]:
        val = raw.get(col)
        row[col] = float(val) if val is not None else np.nan
    for col in schema["categorical"]:
        val = raw.get(col)
        row[col] = str(val) if val is not None else np.nan
    return pd.DataFrame([row], columns=all_cols)


def run_verification():
    all_passed = True
    print("=" * 60)
    print("NeuroGen Suite — PKL Model Verification")
    print("=" * 60)

    # Condition -> model key mapping (strip _no_camera variant)
    condition_keys = list(FEATURE_SCHEMAS.keys())

    for condition in condition_keys:
        model_path = MODELS_DIR / f"{condition}.pkl"
        print(f"\n--- {condition}.pkl ---")

        # Test: Load
        try:
            pipeline = joblib.load(model_path)
            print(f"  Model loading:     PASS ({type(pipeline).__name__})")
        except Exception as e:
            print(f"  Model loading:     FAIL ({e})")
            all_passed = False
            continue

        # Test: Classes
        clf = pipeline.named_steps.get("classifier")
        try:
            classes = list(clf.classes_) if clf else []
            assert sorted(classes) == [0, 1], f"Unexpected classes: {classes}"
            print(f"  Classes check:     PASS (classes={classes})")
        except Exception as e:
            print(f"  Classes check:     FAIL ({e})")
            all_passed = False

        # Test: predict_proba available
        has_proba = hasattr(pipeline, "predict_proba")
        print(f"  predict_proba:     {'PASS' if has_proba else 'FAIL'}")
        if not has_proba:
            all_passed = False

        # Test: prediction on sample
        sample_key = condition
        if sample_key not in SAMPLE_INPUTS:
            print(f"  Prediction test:   SKIP (no sample defined)")
            continue

        df = build_df(condition, SAMPLE_INPUTS[sample_key])
        try:
            pred = pipeline.predict(df)
            proba = pipeline.predict_proba(df)
            predicted_class = int(pred[0])
            prob_at_risk = float(proba[0][1])
            prob_sum = float(proba[0].sum())
            assert abs(prob_sum - 1.0) < 0.001, f"Probabilities don't sum to 1: {prob_sum}"
            print(f"  Prediction:        PASS (class={predicted_class} / {RISK_LABELS[predicted_class]})")
            print(f"  riskProbability:   PASS ({prob_at_risk:.4f})")
            print(f"  Probability sum:   PASS ({prob_sum:.4f})")
        except Exception as e:
            print(f"  Prediction:        FAIL ({e})")
            all_passed = False

        # Extra: test camera-unavailable scenario for dyslexia
        if condition == "dyslexia" and "dyslexia_no_camera" in SAMPLE_INPUTS:
            df_nc = build_df(condition, SAMPLE_INPUTS["dyslexia_no_camera"])
            try:
                pred_nc = pipeline.predict(df_nc)
                proba_nc = pipeline.predict_proba(df_nc)
                print(f"  No-camera test:    PASS (class={int(pred_nc[0])}, P(at_risk)={float(proba_nc[0][1]):.4f})")
            except Exception as e:
                print(f"  No-camera test:    FAIL ({e})")
                all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("[PASS] ALL CHECKS PASSED -- Models ready for inference")
    else:
        print("[FAIL] SOME CHECKS FAILED -- Review errors above")
    print("=" * 60)
    return all_passed


if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
