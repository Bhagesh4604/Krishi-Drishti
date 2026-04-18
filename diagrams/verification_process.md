# Carbon Credit Verification Pipeline
# Krishi-Drishti - 5-Layer Verification Process
# Used in: Section 4.1.4 (Carbon Credit Methodology) of PROJECT_REPORT_FINAL.txt
# Render at: https://mermaid.live

```mermaid
flowchart TD
    A([Farmer Registers Plot on Platform]) --> B

    B[/"Step 1: Plot Registration\n- GPS Polygon Capture\n- Area Calculation - Shoelace Formula\n- Crop Type Declaration"/]

    B --> C[/"Step 2: Baseline Establishment\n- Historical NDVI from Earth Engine last 3 years\n- Compute Baseline Emission\n  = Area × 3.2 tCO2e per ha per year\n- Additionality score check"/]

    C --> D{Is practice additional?\nAdditionality > 0.5 = COMMON\nAdditionality < 0.5 = ELIGIBLE}

    D -->|Practice is common| REJECT([Project Rejected\nPractice not additional])
    D -->|Practice is additional| E

    E[/"Step 3: Carbon Project Enrollment\n- Status set to ENROLLED\n- Methodology selected: No-Till / Cover Crop / Agroforestry\n- Vesting period: 5 years begins"/]

    E --> F[/"Step 4: Evidence Collection Phase\n- Farmer uploads geo-tagged photos monthly\n- Satellite NDVI monitored every 30 days\n- PlotHistory records stored with NDVI, EVI, MSAVI\n- IsolationForest anomaly detection runs weekly"/]

    F --> G{Anomaly Detected\nin NDVI History?}

    G -->|Yes - Suspicious drop| AUDIT([Manual Audit Triggered\nProject flagged for review])
    G -->|No - Normal progression| H

    H[/"Step 5: Credit Calculation\nProjected Sequestration\n= NDVI Index × Area × 1.8\n\nBuffer Pool = 15% locked as reversal insurance\n\nAvailable Credits\n= Projected × 0.85 × 0.80 farmer share"/]

    H --> I[/"Step 6: Credit Issuance\n- Status set to VERIFIED then ISSUED\n- Credits assigned to CarbonProject.available_credits\n- CarbonTransaction record created\n- Payout initiated via Razorpay to farmer UPI"/]

    I --> J([Farmer Receives Payment\nINR 1,500 per tonne × Available Credits])

    style A fill:#2d6a4f,color:#fff
    style REJECT fill:#c1121f,color:#fff
    style AUDIT fill:#e76f51,color:#fff
    style J fill:#2d6a4f,color:#fff
    style B fill:#40916c,color:#fff
    style C fill:#40916c,color:#fff
    style E fill:#52b788,color:#fff
    style F fill:#52b788,color:#fff
    style H fill:#74c69d,color:#000
    style I fill:#74c69d,color:#000
```
