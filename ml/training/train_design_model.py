import argparse
import json
import pickle
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List

import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

DEFAULT_DATASET = Path("ml/product_design_dataset_5000.csv")
DEFAULT_MODEL_PATH = Path("ml/model/design_steps_model.pkl")

INPUT_FEATURES = [
    "productType",
    "purpose",
    "materials",
    "tools",
    "skillLevel",
    "budget",
    "timeWeeks",
    "safetyRequirements",
    "sustainabilityPriority",
]


DATASET_COLUMN_MAP = {
    "productType": "product_type",
    "purpose": "purpose",
    "materials": "preferred_materials",
    "tools": "available_tools",
    "skillLevel": "skill_level",
    "budget": "budget",
    "timeWeeks": "time_weeks",
    "safetyRequirements": "safety_requirements",
    "sustainabilityPriority": "sustainability_priority",
    "target": "design_steps",
}


def normalize_list_like(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        parts = [str(x).strip() for x in value if str(x).strip()]
        return ", ".join(parts)

    text = str(value).strip()
    if not text:
        return ""

    # Handle JSON-style arrays and comma/semicolon separated values.
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]
    parts = [p.strip(" ' \"") for p in re.split(r"[,;|]", text) if p.strip(" ' \"\t\n")]
    return ", ".join(parts) if parts else text


def normalize_bool_like(value: Any) -> str:
    text = str(value).strip().lower()
    if text in {"true", "1", "yes", "y"}:
        return "high"
    if text in {"false", "0", "no", "n"}:
        return "normal"
    return text or "normal"


def build_description(row: pd.Series) -> str:
    return " | ".join(
        [
            f"product_type: {row['productType']}",
            f"purpose: {row['purpose']}",
            f"materials: {row['materials']}",
            f"tools: {row['tools']}",
            f"skill_level: {row['skillLevel']}",
            f"budget: {row['budget']}",
            f"time_weeks: {row['timeWeeks']}",
            f"safety_requirements: {row['safetyRequirements']}",
            f"sustainability_priority: {row['sustainabilityPriority']}",
        ]
    )


def parse_steps_text(steps_text: str) -> List[str]:
    if not isinstance(steps_text, str):
        return []
    cleaned = re.sub(r"\s+", " ", steps_text.strip())
    parts = re.split(r"\s*\d+\.\s*", cleaned)
    parts = [p.strip(" .") for p in parts if p.strip(" .")]
    if parts:
        return parts
    return [segment.strip(" .") for segment in re.split(r"\s*\|\s*", cleaned) if segment.strip(" .")]


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at {path}")

    df = pd.read_csv(path)

    required_columns = [
        DATASET_COLUMN_MAP["productType"],
        DATASET_COLUMN_MAP["purpose"],
        DATASET_COLUMN_MAP["materials"],
        DATASET_COLUMN_MAP["tools"],
        DATASET_COLUMN_MAP["skillLevel"],
        DATASET_COLUMN_MAP["budget"],
        DATASET_COLUMN_MAP["timeWeeks"],
        DATASET_COLUMN_MAP["safetyRequirements"],
        DATASET_COLUMN_MAP["sustainabilityPriority"],
        DATASET_COLUMN_MAP["target"],
    ]

    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}")

    mapped = pd.DataFrame(
        {
            "productType": df[DATASET_COLUMN_MAP["productType"]].fillna("").astype(str),
            "purpose": df[DATASET_COLUMN_MAP["purpose"]].fillna("").astype(str),
            "materials": df[DATASET_COLUMN_MAP["materials"]].apply(normalize_list_like),
            "tools": df[DATASET_COLUMN_MAP["tools"]].apply(normalize_list_like),
            "skillLevel": df[DATASET_COLUMN_MAP["skillLevel"]].fillna("").astype(str),
            "budget": df[DATASET_COLUMN_MAP["budget"]].fillna(0).astype(str),
            "timeWeeks": df[DATASET_COLUMN_MAP["timeWeeks"]].fillna(0).astype(str),
            "safetyRequirements": df[DATASET_COLUMN_MAP["safetyRequirements"]].fillna("").astype(str),
            "sustainabilityPriority": df[DATASET_COLUMN_MAP["sustainabilityPriority"]].apply(normalize_bool_like),
            "design_steps": df[DATASET_COLUMN_MAP["target"]].fillna("").astype(str),
        }
    )

    mapped = mapped[mapped["design_steps"].str.len() > 0].copy()
    mapped["description"] = mapped.apply(build_description, axis=1)
    mapped["step_count"] = mapped["design_steps"].apply(lambda s: len(parse_steps_text(s)))

    return mapped


def train(dataset_path: Path, model_path: Path, test_size: float, random_state: int) -> Dict[str, Any]:
    data = load_dataset(dataset_path)

    X = data["description"]
    y = data["design_steps"]

    stratify = y if y.nunique() > 1 and y.value_counts().min() >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify,
    )

    model = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=1500,
                    min_df=1,
                ),
            ),
            ("svd", TruncatedSVD(n_components=80, random_state=random_state)),
            (
                "rf",
                RandomForestClassifier(
                    n_estimators=30,
                    max_depth=18,
                    min_samples_leaf=2,
                    max_features="sqrt",
                    random_state=random_state,
                    n_jobs=1,
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    acc = accuracy_score(y_test, predictions)

    payload = {
        "model": model,
        "feature_order": INPUT_FEATURES,
        "dataset_column_map": DATASET_COLUMN_MAP,
        "version": 1,
        "metrics": {
            "test_accuracy": float(acc),
            "train_size": int(len(X_train)),
            "test_size": int(len(X_test)),
            "unique_targets": int(y.nunique()),
        },
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as f:
        pickle.dump(payload, f)

    return payload["metrics"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Train design steps model from product design dataset.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--model-output", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    metrics = train(
        dataset_path=args.dataset,
        model_path=args.model_output,
        test_size=args.test_size,
        random_state=args.random_state,
    )

    print(json.dumps({"saved_model": str(args.model_output), "metrics": metrics}, indent=2))


if __name__ == "__main__":
    main()
