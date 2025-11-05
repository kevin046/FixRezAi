# FixRez - Product Requirements Document (PRD)

## 1. Overview

FixRez is a web-based application that uses AI to help job seekers optimize their resumes for specific job descriptions. By pasting their resume and a job description, users will receive an ATS-friendly, keyword-optimized version of their resume tailored to the target role.

## 2. Target Audience

- Job seekers applying to multiple roles
- Career changers
- Students and recent graduates
- Professionals looking to advance their careers

## 3. User Stories & Features

### 3.1. Core Functionality (MVP)

- **As a user, I want to paste my raw resume text into the application.**
- **As a user, I want to paste a job description into the application.**
- **As a user, I want to click an "Optimize" button to start the process.**
- **As a user, I want to see a loading state while the AI processes my information.**
- **As a user, I want to view the AI-generated, optimized resume.**
- **As a user, I want to copy the optimized resume text to my clipboard.**
- **As a user, I want to export the optimized resume as a PDF file.**

### 3.2. V2 Features (Post-MVP)

- **As a user, I want to upload my resume as a PDF or DOCX file.**
- **As a user, I want to create an account to save my optimization history.**
- **As a user, I want to view and revert to previous versions of my resume.**
- **As a user, I want to edit the optimized resume directly in the browser.**
- **As a user, I want to export the resume in multiple formats (e.g., DOCX, TXT).**

## 4. Non-Functional Requirements

- **Performance:** The AI optimization process should take no longer than 30 seconds.
- **Usability:** The interface must be intuitive, mobile-friendly, and require minimal instruction.
- **Security:** API keys and user data must be handled securely.
- **Scalability:** The application should handle at least 1,000 concurrent users.

## 5. Technology Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **AI:** OpenRouter API (with a model like DeepSeek R1)
- **Backend:** Next.js API Routes
- **Database (V2):** Supabase (PostgreSQL)
- **Deployment:** Vercel