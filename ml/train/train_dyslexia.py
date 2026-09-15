"""
Training script for the Dyslexia risk classifier (NeuroGen Suite).

Pipeline:
    CSV load -> validate -> preprocess -> compare classifiers via
    stratified cross-validation -> select best model (by F1) ->
    fit on full training set -> evaluate on held-out test set ->
    save best pipeline -> reload and verify.

Run from the project root:
    python ml/training/train_dyslexia.py
"""

from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.svm import SVC

RANDOM_STATE = 42

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "ml" / "data" / "dyslexia_dataset.csv"
MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "dyslexia.pkl"

TARGET_COLUMN = "risk_group"
ID_COLUMN = "participant_id"

# CV-derived features can be NaN when cameraAvailable is False. Do not
# coerce these to zero -- SimpleImputer handles them inside the pipeline.
NUMERIC_FEATURES = [
    "age",
    "phonicDelay",
    "phonemicSlips",
    "totalAttempts",
    "accuracy",
    "faceDetectedRatio",
    "onScreenEngagementRatio",
    "lookingAwayEvents",
    "totalLookingAwayDurationMs",
    "averageLookingAwayDurationMs",
    "trackingDurationMs",
]
CATEGORICAL_FEATURES = ["cameraAvailable"]


def load_and_validate_data(path: Path) -> pd.DataFrame:
    """Load the CSV and perform basic structural validation."""
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at: {path}")

    df = pd.read_csv(path)

    if df.empty:
        raise ValueError(f"Dataset at {path} is empty.")

    expected_columns = set(NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET_COLUMN, ID_COLUMN])
    missing_columns = expected_columns - set(df.columns)
    if missing_columns:
        raise ValueError(f"Dataset is missing expected columns: {sorted(missing_columns)}")

    if df[TARGET_COLUMN].isnull().any():
        n_missing = int(df[TARGET_COLUMN].isnull().sum())
        print(f"WARNING: dropping {n_missing} rows with missing target '{TARGET_COLUMN}'.")
        df = df.dropna(subset=[TARGET_COLUMN])

    print(f"Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")
    print("Target distribution:")
    print(df[TARGET_COLUMN].value_counts())

    return df


def build_preprocessor(scale_numeric: bool) -> ColumnTransformer:
    """Build a ColumnTransformer. Numeric features are median-imputed
    (and scaled for distance/gradient-based models); the boolean
    cameraAvailable indicator is mode-imputed and one-hot encoded."""
    numeric_steps = [("imputer", SimpleImputer(strategy="median"))]
    if scale_numeric:
        numeric_steps.append(("scaler", StandardScaler()))
    numeric_pipeline = Pipeline(steps=numeric_steps)

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(drop="if_binary", handle_unknown="ignore")),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )


def get_candidate_models():
    """Return {name: (estimator, needs_scaled_numeric_features)}."""
    return {
        "Logistic Regression": (
            LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
            True,
        ),
        "Random Forest": (
            RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE),
            False,
        ),
        "SVM": (
            CalibratedClassifierCV(SVC(random_state=RANDOM_STATE), ensemble=False),
            True,
        ),
        "Gradient Boosting": (
            GradientBoostingClassifier(random_state=RANDOM_STATE),
            False,
        ),
    }


def evaluate_candidates(X_train, y_train, cv):
    """Run stratified CV for every candidate model and collect metrics."""
    results = {}
    scoring = {
        "accuracy": "accuracy",
        "precision": "precision_weighted",
        "recall": "recall_weighted",
        "f1": "f1_weighted",
    }

    print("\n" + "=" * 40)
    print("MODEL COMPARISON (stratified 5-fold CV on training set)")
    print("=" * 40)

    for name, (estimator, scale_numeric) in get_candidate_models().items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(scale_numeric)),
                ("classifier", estimator),
            ]
        )

        cv_results = cross_validate(
            pipeline, X_train, y_train, cv=cv, scoring=scoring, n_jobs=-1
        )

        results[name] = {
            "pipeline": pipeline,
            "cv_accuracy": cv_results["test_accuracy"].mean(),
            "cv_precision": cv_results["test_precision"].mean(),
            "cv_recall": cv_results["test_recall"].mean(),
            "cv_f1": cv_results["test_f1"].mean(),
        }

        print(f"\n{name}")
        print(f"  CV Accuracy:  {results[name]['cv_accuracy']:.4f}")
        print(f"  CV Precision: {results[name]['cv_precision']:.4f}")
        print(f"  CV Recall:    {results[name]['cv_recall']:.4f}")
        print(f"  CV F1:        {results[name]['cv_f1']:.4f}")

    return results


def select_best_model(results):
    """Pick the model with the highest mean CV F1 score."""
    best_name = max(results, key=lambda name: results[name]["cv_f1"])
    print("\n" + "=" * 40)
    print(f"BEST MODEL: {best_name}")
    print(f"BEST CV F1: {results[best_name]['cv_f1']:.4f}")
    print("=" * 40)
    return best_name, results[best_name]


def final_evaluation(pipeline, X_test, y_test, label_encoder):
    """Evaluate the fitted best pipeline once on the untouched test set."""
    y_pred = pipeline.predict(X_test)

    n_classes = len(label_encoder.classes_)
    roc_auc = None
    try:
        if hasattr(pipeline, "predict_proba"):
            y_proba = pipeline.predict_proba(X_test)
            if n_classes == 2:
                roc_auc = roc_auc_score(y_test, y_proba[:, 1])
            else:
                roc_auc = roc_auc_score(
                    y_test, y_proba, multi_class="ovr", average="weighted"
                )
    except Exception as exc:
        print(f"NOTE: could not compute ROC-AUC ({exc}).")

    print("\n" + "=" * 40)
    print("FINAL TEST RESULTS")
    print("=" * 40)
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"F1 Score:  {f1_score(y_test, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}" if roc_auc is not None else "ROC-AUC:   N/A")

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            y_pred,
            target_names=[str(c) for c in label_encoder.classes_],
            zero_division=0,
        )
    )

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))


def save_and_verify_model(pipeline, X_test, model_path: Path):
    """Persist the winning pipeline, then reload it and run a sample
    prediction to confirm it was saved correctly."""
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    print(f"\nBest model saved to: {model_path}")

    loaded_pipeline = joblib.load(model_path)
    sample = X_test.iloc[:1]
    prediction = loaded_pipeline.predict(sample)

    print("Model successfully saved.")
    print("Model successfully reloaded.")
    print("Test prediction successful.")
    print(f"Test prediction: {prediction}")

    if hasattr(loaded_pipeline, "predict_proba"):
        try:
            probability = loaded_pipeline.predict_proba(sample)
            print(f"Test prediction probability: {probability}")
        except Exception as exc:
            print(f"NOTE: predict_proba unavailable ({exc}).")

    print(f"Saved to: {model_path}")


def main():
    print(f"Loading dataset from: {DATA_PATH}")
    df = load_and_validate_data(DATA_PATH)

    # Cast bool columns to str so SimpleImputer receives strings, not booleans
    # (sklearn >=1.5 rejects bool dtype in SimpleImputer).
    for col in CATEGORICAL_FEATURES:
        if col in df.columns:
            df[col] = df[col].astype(str)

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES].copy()
    y_raw = df[TARGET_COLUMN]

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    print(f"Target classes: {list(label_encoder.classes_)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\nTrain size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    results = evaluate_candidates(X_train, y_train, cv)

    best_name, best_result = select_best_model(results)
    best_pipeline = best_result["pipeline"]

    # Fit the winning pipeline on the full training set (test set untouched
    # until final_evaluation below).
    best_pipeline.fit(X_train, y_train)

    final_evaluation(best_pipeline, X_test, y_test, label_encoder)

    save_and_verify_model(best_pipeline, X_test, MODEL_PATH)

    print("\n" + "=" * 40)
    print("SUMMARY")
    print("=" * 40)
    print(f"Winning algorithm: {best_name}")
    print(f"CV F1 (selection metric): {best_result['cv_f1']:.4f}")
    print(f"Saved to: {MODEL_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: training failed - {exc}", file=sys.stderr)
        raise
