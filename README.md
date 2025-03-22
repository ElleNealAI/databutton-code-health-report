# Databutton Code Health Report

## Overview
A plug-and-play code health analysis tool for Databutton apps that helps you monitor, measure, and improve your codebase quality over time.

## Features
- 📊 **Complete Code Analysis**: Evaluates your entire codebase including Pages, UI Components, APIs, and UI Utilities.
- 📈 **Historical Tracking**: Records code health metrics over time to track improvements.
- 🔍 **Detailed Component Analysis**: Identifies specific issues in each file.
- 📱 **Interactive Dashboard**: Visual representation of code health with charts and tables.
- 🔄 **Firestore Analysis**: Additional insights for apps using Firestore.
- 🛠️ **Actionable Recommendations**: Provides specific suggestions to improve code quality.

## Installation

WIP - Task Instructions for Databutton Agent

WIP - manually add files to your Databutton Application

## Usage

### Running a Code Health Analysis
1. Navigate to the **Code Health History** page in your app.
2. Click the **"Analyze Codebase"** button.
3. View the overall score and detailed metrics for your app.

| Quality Check Type      | What It Means | Why It Matters | Consequences If Ignored |
|------------------------|--------------|---------------|-------------------------|
| **Size Score** | Measures the size of a file. Lower scores indicate files that are too large. | Large files become hard to read, debug, and maintain. They often mix multiple responsibilities, making them difficult to refactor. | The AI Agent will struggle to process oversized files effectively. Maintaining and modifying the code becomes increasingly difficult over time. |
| **Complexity Score** | Assesses how intricate the logic is, including the number of imports, nested loops, and logical branches. | Complex code increases cognitive load, making it harder for developers (and the AI Agent) to follow logic and predict behavior. | Debugging takes longer, testing becomes harder, and AI-generated fixes may not be reliable due to unpredictable logic paths. |
| **Duplication Score** | Identifies repeated code patterns across the app. | Repeated logic makes it harder to maintain consistency. Fixing one issue requires updating multiple locations. | Bugs may persist in duplicate code, AI-generated changes may apply fixes to some areas but miss others, and app size increases unnecessarily. |
| **Function Length Score** | Detects functions that are too long (too many lines of code). | Functions should follow the "Single Responsibility Principle." Shorter, focused functions are easier to test and debug. | Large functions make code harder to read and modify. The AI Agent may struggle to suggest precise edits without affecting unrelated logic. |
| **Comment Density Score** | Measures whether code has enough explanatory comments. | Comments help new developers (and the AI Agent) understand intent, especially in complex areas. | Without comments, AI-generated updates might not align with the developer’s original intent, leading to unintended behavior or regressions. |
| **Naming Convention Score** | Checks if variables, functions, and components follow consistent naming patterns. | Clear, meaningful names make code more readable and self-documenting. | Poor naming increases confusion, making it harder for the AI Agent to correctly infer relationships between variables, components, and functions. |


### Reading the Dashboard
- **Overall Score**: A composite health score out of 100.
- **Component Scores**: Breakdown by app section (Pages, Components, APIs, etc.).
- **Historical Trends**: Chart showing health score changes over time.
- **File Details**: Expandable sections with file-specific metrics.
- **Recommendations**: Actionable suggestions for improvement.

## Components

### Backend
- **Code History API**: Handles codebase scanning, analysis, and metric storage.

### Frontend
- **CodeHealthHistory**: Main dashboard page displaying all metrics.
- **CodeHealthChart**: Visualizes historical health data.
- **FinalScoreTable**: Displays detailed scores by component.
- **SectionAccordion**: Expandable UI for organizing detailed metrics.
- **codeHealthUtils**: Helper functions for processing health data.

## Dependencies
- **Frontend**: React, Recharts, Tailwind CSS.
- **Backend**: FastAPI, Databutton SDK.

## Troubleshooting
- **Missing Charts**: Ensure Recharts is installed in your project.
- **API Errors**: Check that the `code_history` API is correctly installed.
- **Empty History**: Run an initial analysis to generate historical data.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

> **Note**: This tool analyzes your codebase structure and provides recommendations based on established best practices. Results should be interpreted as guidance rather than absolute rules.
