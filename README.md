# Internship Application Management System

An Excel-based system for organizing internship searches, prioritizing opportunities, selecting application materials, and preserving application history.

The workbook is designed for students managing applications across several career areas. It combines an application pipeline, weighted prioritization, résumé recommendations, material readiness, posting verification, duplicate detection, follow-up tracking, and archiving in one file.

All companies, links, dates, and application activity in this public demonstration are fictional.

## Preview

![Dashboard](screenshots/dashboard.png)

![Opportunity pipeline](screenshots/opportunities.png)

## Main features

- Weighted priority scoring based on location, company interest, role fit, résumé match, and deadline urgency
- Automatic résumé recommendations based on career category
- Status-based row colors for planning, applied, interviewing, offers, and terminal outcomes
- Application-material checklist for résumés, cover letters, transcripts, writing samples, and references
- Duplicate detection for repeated company-and-position combinations
- Link classification and posting-verification indicators
- Company-level guardrails that flag multiple applications for review
- Follow-up dates and application notes
- Archive for rejected, withdrawn, closed, and expired opportunities
- Dashboard summarizing the current pipeline and weekly activity
- Optional networking and document-organization worksheets

## Workbook structure

| Worksheet | Purpose |
| --- | --- |
| Dashboard | Summarizes active opportunities, applications, deadlines, interviews, offers, and archived records. |
| Opportunities | Holds the active application pipeline and calculates recommendations and priorities. |
| Lists | Stores values used by dropdown menus and workflow controls. |
| Archive | Preserves terminal application outcomes without deleting history. |
| Networking | Tracks verified professional contacts and follow-ups. |
| Materials | Maps career areas to the appropriate résumé and cover-letter folders. |

## How prioritization works

The priority score uses five factors:

| Factor | Weight |
| --- | ---: |
| Location | 20% |
| Company interest | 20% |
| Role fit | 25% |
| Résumé match | 20% |
| Deadline urgency | 15% |

The three personal-fit ratings are editable on a 1–5 scale. Formula-driven fields update the overall score and assign a High, Medium, or Low priority.

## How to use the workbook

1. Download `Internship_Application_Management_System.xlsx`.
2. Replace the fictional sample records with your own opportunities.
3. Customize the categories and résumé mappings for your field.
4. Update the yellow input fields as you apply and hear back.
5. Filter by priority, application status, location, or verification status.
6. Move terminal outcomes to the Archive while preserving their history.

The Excel workbook does not search job boards by itself. Live posting updates require a separate scheduled workflow that researches openings, verifies links, checks duplicates, and safely updates the local file.

## Development approach

I defined the requirements, workflow rules, scoring model, status behavior, and privacy constraints. I then tested and refined the workbook through several iterations. OpenAI Codex and Claude were used as AI-assisted development tools for implementation support, formula design, research workflows, and quality checks.

## Skills demonstrated

- Microsoft Excel
- Spreadsheet formulas and conditional formatting
- Data validation and structured tables
- Requirements gathering
- Workflow design
- Data organization and quality control
- Product thinking and iterative testing
- AI-assisted development

## Privacy

This repository contains only fictional demonstration data. A personal application tracker should not be committed because it may include private notes, recruiter details, application history, or identifying information.

