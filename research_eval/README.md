# Krishi-Drishti — Research Evaluation Suite
# research_eval/README.md

## Folder Structure

```
research_eval/
├── README.md                    ← This file (start here)
├── run_all.py                   ← ONE-CLICK: runs all evaluations
│
├── scripts/                     ← All evaluation Python scripts
│   ├── eval_vision.py           ← Vision AI accuracy (Gemini)
│   ├── eval_soc.py              ← SOC prediction (R², RMSE, MAE)
│   ├── eval_system.py           ← API performance + SUS usability
│   └── setup_test_images.py     ← Organizes PlantVillage dataset
│
├── test_images/                 ← Put crop images here for Vision eval
│   ├── healthy/                 ← Healthy crop images
│   ├── bacterial_blight/        ← Bacterial blight images
│   ├── brown_spot/              ← Brown spot images
│   ├── leaf_blast/              ← Leaf blast / late blight images
│   └── powdery_mildew/          ← Powdery mildew images
│
├── eval_data/                   ← Input data for evaluations
│   └── soil_samples.csv         ← GPS + actual SOC values (replace with real data)
│
└── eval_results/                ← All output results (auto-generated)
    ├── vision_results.json      ← Vision AI metrics
    ├── soc_results.json         ← SOC model metrics
    ├── system_results.json      ← API performance metrics
    └── usability_results.json   ← SUS usability score
```

---

## Step-by-Step Instructions

### Step 1: Set up test images (after PlantVillage download)
```powershell
cd research_eval\scripts
python setup_test_images.py
```

### Step 2: Run all evaluations at once
```powershell
cd research_eval
python run_all.py
```

### Step 3: Run individual scripts
```powershell
cd research_eval\scripts

python eval_vision.py     # Vision AI accuracy — needs GEMINI_API_KEY
python eval_soc.py        # SOC model accuracy
python eval_system.py     # API speed + usability score
```

---

## What Goes Into Your Research Paper

| Result File | Paper Section | Metrics |
|---|---|---|
| `vision_results.json` | Table IV.1 | Accuracy, Precision, Recall, F1 |
| `soc_results.json` | Table IV.2 | R², RMSE, MAE, CCC |
| `system_results.json` | Table IV.4 | Avg ms, P95 ms, Concurrent users |
| `usability_results.json` | Table IV.5 | SUS score (0–100) |

---

## Data Sources

| Data | Source | Free? |
|---|---|---|
| Plant disease images | [PlantVillage on Kaggle](https://www.kaggle.com/datasets/emmarex/plantdisease) | YES |
| Soil organic carbon | [ISRIC WoSIS](https://www.isric.org/explore/wosis) | YES |
| Indian soil data | [India Soil Health Card](https://soilhealth.dac.gov.in) | YES |
