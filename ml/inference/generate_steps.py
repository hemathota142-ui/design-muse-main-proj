import argparse
import json
import pickle
import re
from pathlib import Path
from typing import Any, Dict, List

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


def normalize_list_like(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if str(v).strip())
    text = str(value).strip()
    if not text:
        return ""
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


def normalize_input(raw: Dict[str, Any]) -> Dict[str, str]:
    # Accept either camelCase or snake_case keys.
    mapped = {
        "productType": raw.get("productType") or raw.get("product_type") or "",
        "purpose": raw.get("purpose") or "",
        "materials": raw.get("materials") or raw.get("preferred_materials") or "",
        "tools": raw.get("tools") or raw.get("available_tools") or "",
        "skillLevel": raw.get("skillLevel") or raw.get("skill_level") or "",
        "budget": raw.get("budget") or "",
        "timeWeeks": raw.get("timeWeeks") or raw.get("time_weeks") or "",
        "safetyRequirements": raw.get("safetyRequirements") or raw.get("safety_requirements") or "",
        "sustainabilityPriority": raw.get("sustainabilityPriority") or raw.get("sustainability_priority") or "",
    }

    normalized = {
        "productType": str(mapped["productType"]).strip(),
        "purpose": str(mapped["purpose"]).strip(),
        "materials": normalize_list_like(mapped["materials"]),
        "tools": normalize_list_like(mapped["tools"]),
        "skillLevel": str(mapped["skillLevel"]).strip(),
        "budget": str(mapped["budget"]).strip(),
        "timeWeeks": str(mapped["timeWeeks"]).strip(),
        "safetyRequirements": str(mapped["safetyRequirements"]).strip(),
        "sustainabilityPriority": normalize_bool_like(mapped["sustainabilityPriority"]),
    }
    return normalized


def build_description(features: Dict[str, str]) -> str:
    return " | ".join(
        [
            f"product_type: {features['productType']}",
            f"purpose: {features['purpose']}",
            f"materials: {features['materials']}",
            f"tools: {features['tools']}",
            f"skill_level: {features['skillLevel']}",
            f"budget: {features['budget']}",
            f"time_weeks: {features['timeWeeks']}",
            f"safety_requirements: {features['safetyRequirements']}",
            f"sustainability_priority: {features['sustainabilityPriority']}",
        ]
    )


def parse_steps_text(steps_text: str) -> List[str]:
    if not isinstance(steps_text, str):
        return []

    cleaned = re.sub(r"\s+", " ", steps_text.strip())
    parts = re.split(r"\s*\d+\.\s*", cleaned)
    parts = [p.strip(" .") for p in parts if p.strip(" .")]

    if not parts:
        parts = [segment.strip(" .") for segment in re.split(r"\s*\|\s*", cleaned) if segment.strip(" .")]
    return parts


def sentence_to_title(sentence: str, index: int) -> str:
    s = sentence.lower()
    keyword_titles = [
        ("requirement", "Define Requirements"),
        ("goal", "Define Goals"),
        ("framework", "Build Framework"),
        ("enclosure", "Design Enclosure"),
        ("ergonomic", "Optimize Ergonomics"),
        ("manufacture", "Manufacture Components"),
        ("fabricate", "Fabricate Prototype"),
        ("integrate", "Integrate Systems"),
        ("install", "Install Subsystems"),
        ("test", "Test and Validate"),
        ("safety", "Safety and Compliance"),
        ("finalize", "Finalize Design"),
    ]
    for key, title in keyword_titles:
        if key in s:
            return title

    words = re.findall(r"[A-Za-z0-9]+", sentence)
    return " ".join(words[:4]).title() if words else f"Step {index}"


def infer_effort(index: int, total: int) -> str:
    if index in (1, 2):
        return "Low"
    if index in (total, total - 1):
        return "Medium"
    return "High" if 3 <= index <= max(3, total - 2) else "Medium"


def infer_duration(index: int) -> str:
    duration_map = {
        1: "1-2 hours",
        2: "2-3 hours",
        3: "3-5 hours",
        4: "2-4 hours",
        5: "2-3 hours",
        6: "1-2 hours",
        7: "1-2 hours",
    }
    return duration_map.get(index, "1-3 hours")


def to_workflow_steps(step_sentences: List[str], features: Dict[str, str]) -> List[Dict[str, Any]]:
    materials = [m.strip() for m in features.get("materials", "").split(",") if m.strip()]
    safety_text = features.get("safetyRequirements", "").strip()

    workflow_steps: List[Dict[str, Any]] = []
    total = len(step_sentences)

    for idx, sentence in enumerate(step_sentences, start=1):
        title = sentence_to_title(sentence, idx)
        step: Dict[str, Any] = {
            "id": str(idx),
            "title": title,
            "description": sentence,
            "duration": infer_duration(idx),
            "effort": infer_effort(idx, total),
            "completed": False,
        }

        if idx == 1 and materials:
            step["materials"] = materials

        if safety_text and ("safety" in sentence.lower() or "compliance" in sentence.lower() or idx == total):
            step["safetyNote"] = safety_text

        workflow_steps.append(step)

    return workflow_steps


def predict(input_payload: Dict[str, Any], model_path: Path) -> Dict[str, Any]:
    if not model_path.exists():
        raise FileNotFoundError(f"Trained model not found at {model_path}")

    with model_path.open("rb") as f:
        payload = pickle.load(f)

    model = payload["model"]
    features = normalize_input(input_payload)
    description = build_description(features)

    predicted_steps_text = model.predict([description])[0]
    step_sentences = parse_steps_text(predicted_steps_text)
    workflow_steps = to_workflow_steps(step_sentences, features)

    return {
        "workflowSteps": workflow_steps,
        "predicted_design_steps": predicted_steps_text,
        "input": features,
    }


def load_input(args: argparse.Namespace) -> Dict[str, Any]:
    if args.input_json:
        return json.loads(args.input_json)
    if args.input_file:
        return json.loads(Path(args.input_file).read_text(encoding="utf-8-sig"))

    raw = input().strip()
    if not raw:
        raise ValueError("No input provided. Pass --input-json/--input-file or pipe JSON via stdin.")
    return json.loads(raw)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate workflow steps from design constraints.")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--input-json", type=str)
    parser.add_argument("--input-file", type=str)
    args = parser.parse_args()

    payload = load_input(args)
    result = predict(payload, args.model)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
