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
