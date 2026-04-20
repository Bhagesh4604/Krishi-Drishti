# System Architecture Diagram
# Krishi-Drishti - Five Layer Architecture
# Used in: Section 4.1.1 of PROJECT_REPORT_FINAL.txt
# Render at: https://mermaid.live

```mermaid
graph TB
    %% Styling definitions
    classDef presentation fill:#e3f2fd,stroke:#0288d1,stroke-width:2px,color:#000
    classDef gateway fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#000
    classDef service fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    classDef db fill:#fce4ec,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef external fill:#f5f5f5,stroke:#616161,stroke-width:2px,color:#000

    subgraph L1["📱 Layer 1 — User Interfaces"]
        subgraph F1["👨‍🌾 Farmer Mobile Application"]
            A1[fa:fa-user User Onboarding & KYC]
            A2[fa:fa-map Farm Mapping & Geofencing]
            A3[fa:fa-leaf AI Crop Diagnostics]
            A4[fa:fa-wallet Carbon Credit Wallet]
            A5[fa:fa-handshake Direct Marketplace]
        end
        subgraph F2["💼 Global Admin Console"]
            A6[fa:fa-chart-line Real-Time Analytics]
            A7[fa:fa-map-marked-alt Regional Heatmaps]
            A8[fa:fa-check-circle Carbon Auditing]
        end
    end

    subgraph L2["🌐 Layer 2 — API Gateway & Security"]
        B1["fa:fa-shield-alt Auth & Role-Based Access"]
        B2["fa:fa-route Request Routing & Rate Limiting"]
    end

    subgraph L3["⚙️ Layer 3 — Core Business Engines"]
        C1[fa:fa-satellite Satellite Verification Engine]
        C2[fa:fa-bug Bio-Acoustics & Disease ML]
        C3[fa:fa-tree Carbon Additionality Pipeline]
        C4[fa:fa-cloud-sun Hyper-local Weather Engine]
        C5[fa:fa-store Marketplace & Bidding System]
    end

    subgraph L4["🗄️ Layer 4 — Data Management"]
        D1[(fa:fa-users Farmer & Farm Profiles)]
        D2[(fa:fa-chart-bar Aggregated Telemetry)]
        D3[(fa:fa-link Blockchain Transaction Ledgers)]
    end

    subgraph L5["🔗 Layer 5 — External Integrations"]
        E1[fa:fa-globe Google Earth Engine]
        E2[fa:fa-robot AI Models: Gemini & YOLOv8]
        E3[fa:fa-credit-card Payment Gateways]
        E4[fa:fa-cloud Weather & Climate APIs]
    end

    %% Edge Connections
    F1 -->|"Action Requests"| L2
    F2 -->|"Admin Queries"| L2
    L2 -->|"Secure Routing"| L3
    
    L3 -->|"Reads/Writes Data"| L4
    L3 -->|"Fetches external context"| L5
    
    %% Internal Service connections
    C1 -.->|"Validates boundaries"| C3
    C2 -.->|"Alerts via"| C4
    C3 -.->|"Lists on"| C5

    %% Apply Styles
    class A1,A2,A3,A4,A5,A6,A7,A8 presentation;
    class B1,B2 gateway;
    class C1,C2,C3,C4,C5 service;
    class D1,D2,D3 db;
    class E1,E2,E3,E4 external;
```
