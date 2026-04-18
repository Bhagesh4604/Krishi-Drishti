# Diagrams — README
# Krishi-Drishti Project
# =====================================================================

This folder contains all Mermaid diagram source files for the
Krishi-Drishti project report (PROJECT_REPORT_FINAL.txt).

All diagrams are written in Mermaid syntax. To view them:

  Option 1: Paste into https://mermaid.live (online editor, instant preview)
  Option 2: Install VS Code extension "Markdown Preview Mermaid Support"
            then open any .md file and press Ctrl+Shift+V
  Option 3: Use GitHub — push the diagrams folder to a GitHub repo.
            GitHub renders Mermaid diagrams natively in markdown files.

=====================================================================
DIAGRAM LIST
=====================================================================

  1. system_architecture.md
     Description : Five-layer architecture diagram of the complete system.
     Section Ref : Section 4.1.1 of PROJECT_REPORT_FINAL.txt
     Diagram Type: graph TB (top-to-bottom flowchart with subgraphs)

  2. farmer_workflow.md
     Description : Full farmer user journey — login, disease diagnosis,
                   farm map analysis, weather, and APScheduler tasks.
     Section Ref : Section 4.1.2 of PROJECT_REPORT_FINAL.txt
     Diagram Type: sequenceDiagram

  3. verification_process.md
     Description : 6-step carbon credit verification pipeline including
                   baseline computation, anomaly detection, buffer pool,
                   and payout flow.
     Section Ref : Section 4.1.4 of PROJECT_REPORT_FINAL.txt
     Diagram Type: flowchart TD (top-down)

  4. database_schema.md
     Description : Entity Relationship Diagram (ERD) for all 13+ tables
                   in the Krishi-Drishti database with relationships.
     Section Ref : Section 4.1.1 Layer 4 of PROJECT_REPORT_FINAL.txt
     Diagram Type: erDiagram

  5. tech_stack.md
     Description : Complete technology architecture showing frontend,
                   backend, AI/satellite, infrastructure, and external
                   service layers with connections.
     Section Ref : Section 3.2 of PROJECT_REPORT_FINAL.txt
     Diagram Type: graph LR (left-to-right with subgraphs)

  6. competitive_analysis.md
     Description : Quadrant chart comparing Krishi-Drishti against
                   existing platforms on capability vs accessibility axes.
     Section Ref : Section 2.1 of PROJECT_REPORT_FINAL.txt
     Diagram Type: quadrantChart

  7. ml_pipeline.md
     Description : Machine learning pipeline showing weather fetch,
                   satellite NDVI computation, IsolationForest anomaly
                   detection, and disease forecasting workflow.
     Section Ref : Section 4.1.5 and 5.1.8 of PROJECT_REPORT_FINAL.txt
     Diagram Type: flowchart LR (left-to-right with subgraphs)

=====================================================================
EXPORT FOR SUBMISSION
=====================================================================

To export a diagram as PNG for inclusion in a Word/PDF document:
  1. Go to https://mermaid.live
  2. Paste the Mermaid code (inside the code block)
  3. Click "PNG" button in the top-right Actions panel
  4. Download and insert into your Word document

=====================================================================
