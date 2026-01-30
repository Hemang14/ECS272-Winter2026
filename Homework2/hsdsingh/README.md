# Homework 2 – Visualization Dashboard (ECS 272)

## Overview
This project presents a web-based visualization dashboard for exploring the **Paris 2024 Olympic Games** dataset.  
The dashboard follows a **focus + context** design paradigm, guiding users from a global overview of medal distribution to sport-level patterns and detailed medal flows.

## Dataset
The dashboard uses the official Paris 2024 Olympic datasets provided for the assignment, including:
- Country-level medal totals
- Sport-specific final results (multiple CSV files)
- Medal types (Gold, Silver, Bronze)

All data is loaded statically from CSV files.

## Dashboard Design
The dashboard is organized into three coordinated views within a single fullscreen layout:

### 1. Overview
**Stacked Bar Chart**  
Shows medal distribution for the top countries, stacked by medal type (Gold, Silver, Bronze).  
This view provides a high-level comparison of overall Olympic performance.

### 2. Context
**Heatmap (Country × Sport)**  
Displays how medals are distributed across sports for top-performing countries.  
This view reveals country specialization and sport-level patterns.

### 3. Focus
**Sankey Diagram (Advanced Visualization)**  
Illustrates the flow of medals from **Countries → Sports → Medal Types**, highlighting structural relationships in Olympic success.

## Visualization Techniques
- Stacked bar chart
- Heatmap (matrix view)
- Sankey diagram (advanced visualization)

All visualizations are implemented using **D3.js** and are fully responsive.

## Interaction
- Hover tooltips on all charts
- Hover highlighting for bar chart rows, heatmap cells, and Sankey nodes/links
- Dropdown control to adjust the number of countries displayed in the overview chart

## Design Considerations
- Single fullscreen dashboard with no scrolling
- Consistent color encoding for medal types
- Subtle pale background and card layout for readability
- Clear titles, axes, legends, and labels

## How to Run
```bash
npm install
npm run dev
```
