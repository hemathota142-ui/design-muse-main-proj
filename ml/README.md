# Design Steps ML Pipeline

This folder contains training and inference scripts that generate `workflowSteps[]` from product design constraints.

## 1) Install dependencies

```bash
pip install -r ml/requirements.txt
```

## 2) Retrain model

```bash
python ml/training/train_design_model.py \
  --dataset ml/product_design_dataset_5000.csv \
  --model-output ml/model/design_steps_model.pkl
```

This will:
- preprocess dataset
- combine all input features into one text `description`
- normalize list-like materials/tools fields
- split train/test
- train TF-IDF + TruncatedSVD + RandomForest model
- save the trained model to `ml/model/design_steps_model.pkl`

## 3) Run local inference

```bash
python ml/inference/generate_steps.py --input-json "{\"productType\":\"Smart Furniture\",\"purpose\":\"Compact storage for students\",\"materials\":[\"Aluminum\",\"ABS Plastic\"],\"tools\":[\"CNC Machine\",\"Hand Tools\"],\"skillLevel\":\"Intermediate\",\"budget\":12000,\"timeWeeks\":8,\"safetyRequirements\":\"Ensure stable structure and safe edges\",\"sustainabilityPriority\":true}"
```

Output includes:
- `workflowSteps[]` (exact interface expected by UI)
- `predicted_design_steps` (raw model output)

## 4) Supabase edge function

A new function is available at:
- `supabase/functions/generate-workflow-steps`

Deploy it using Supabase CLI. Optionally set:
- `ML_INFERENCE_URL` to your hosted Python inference endpoint.

If `ML_INFERENCE_URL` is not configured, function returns deterministic fallback `workflowSteps[]`.
