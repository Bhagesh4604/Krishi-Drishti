# Krishi-Drishti Diagrams

This folder contains Mermaid diagram definitions for visualizing the Krishi-Drishti project architecture, workflows, and timelines.

## How to View Diagrams

### Option 1: GitHub (Recommended)
- Upload the entire `diagrams/` folder to GitHub
- Mermaid diagrams automatically render in the README

### Option 2: Mermaid Live Editor
- Go to https://mermaid.live
- Copy the content of any .md file (without the ```mermaid markers)
- Paste into the editor
- Diagrams render live

### Option 3: VS Code (with Mermaid Preview)
- Install extension: "Markdown Preview Mermaid Support"
- Open any .md file
- Press Cmd+Shift+V (Mac) or Ctrl+Shift+V (Windows)
- Diagrams render in preview pane

### Option 4: Generate as Images
```bash
# Install mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i system_architecture.md -o system_architecture.png
mmdc -i farmer_workflow.md -o farmer_workflow.png
mmdc -i verification_process.md -o verification_process.png
mmdc -i project_timeline.md -o project_timeline.png
mmdc -i competitive_analysis.md -o competitive_analysis.png
mmdc -i tech_stack.md -o tech_stack.png
```

## Diagram Descriptions

### 1. system_architecture.md
**Purpose**: High-level system architecture showing all layers and integrations

**Contains**:
- Frontend Layer (React Native app, admin dashboard)
- API Layer (FastAPI routers)
- Service Layer (business logic)
- External Integrations (Earth Engine, Aggregators, Registry)
- Database Layer (PostgreSQL, IPFS, S3)

**Use Case**: Explains system design to stakeholders, technical leads, new team members

---

### 2. farmer_workflow.md
**Purpose**: Step-by-step sequence of farmer interaction with the platform

**Contains**:
- Farmer enters farm location → Satellite analysis
- Logs practice → Validation
- Submits to aggregator → Report generation

**Use Case**: Understanding farmer journey, identifying UX improvement opportunities

---

### 3. verification_process.md
**Purpose**: Multi-layer carbon credit verification pipeline

**Contains**:
- Phase 1: Satellite Data (Day 1)
- Phase 2: Practice Verification (Days 2-7)
- Phase 3: Baseline Comparison (Days 1-7)
- Phase 4: Risk Assessment (Day 7)
- Phase 5: Aggregator & Registry (Days 7-30)

**Use Case**: Explains verification methodology to carbon market stakeholders

---

### 4. project_timeline.md
**Purpose**: Gantt chart of development roadmap across 6 months

**Contains**:
- Phase 1: MVP (Weeks 2-6)
- Phase 2: Monetization (Weeks 6-10)
- Phase 3: Registry (Weeks 10-18)
- Phase 4: Enterprise (Weeks 18+)

**Use Case**: Project planning, sprint scheduling, stakeholder communication

---

### 5. competitive_analysis.md
**Purpose**: Feature comparison with existing competitors

**Contains**:
- Krishi-Drishti current state (MVP)
- Boomitra (direct competitor)
- EKI Energy (enterprise competitor)
- Grow Indigo (USA platform)

**Use Case**: Investor pitches, market positioning discussions

---

### 6. tech_stack.md
**Purpose**: All technologies and frameworks used in the project

**Contains**:
- Frontend Stack (React, TypeScript, Tailwind)
- Backend Stack (FastAPI, Python)
- Data Processing (Earth Engine, NumPy)
- Database & Storage (PostgreSQL, IPFS, S3)
- ML & Analytics (scikit-learn, anomaly detection)
- Integrations (Razorpay, Blockchain, Registry APIs)
- Infrastructure (AWS, GitHub Actions, Docker)

**Use Case**: Onboarding developers, architecture review, dependency planning

---

## Integration with Project Report

All diagrams are referenced in PROJECT_REPORT.txt:

- **Section 4.1**: System Architecture (system_architecture.md)
- **Section 4.2**: Verification Process (verification_process.md)
- **Section 5.1**: Farmer Workflow (farmer_workflow.md)
- **Section 5.1.1**: Development Approach references tech_stack.md

---

## Updating Diagrams

To modify any diagram:

1. Open the corresponding .md file in a text editor
2. Edit the Mermaid syntax (see https://mermaid.live for syntax help)
3. View changes in Mermaid Live Editor
4. Save changes

Example modification:
```mermaid
# Add a new component to system_architecture.md
subgraph "New Component"
    X["New Service"]
end

# Add connection
B1 --> X
```

---

## Exporting Diagrams

### For Presentations (PowerPoint/Google Slides)
1. Go to mermaid.live
2. Render the diagram
3. Right-click → "Save image as"
4. Insert into presentation

### For Documentation
1. Convert using mermaid CLI (see Option 4)
2. Place PNG files in a `/images` folder
3. Reference in markdown: `![Diagram](./images/system_architecture.png)`

### For Printing
1. Generate PNG with 300 DPI
2. Convert PNG to PDF if needed
3. Print on A4/A3 depending on complexity

---

## Diagram Format Notes

- All diagrams use Mermaid graph/timeline syntax
- Compatible with GitHub, GitLab, Gitea markdown renderers
- Responsive to light/dark theme
- Works in all modern browsers

## Support & Questions

For diagram improvements or questions:
- Review Mermaid documentation: https://mermaid.live
- Check syntax examples: https://mermaid.js.org/intro/
- Modify and test in Mermaid Live Editor before committing
