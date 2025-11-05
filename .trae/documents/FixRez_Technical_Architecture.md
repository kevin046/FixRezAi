# FixRez - Technical Architecture

## 1. System Overview

FixRez is a serverless web application built on a modern Jamstack architecture. It leverages a Next.js frontend, a serverless backend via Next.js API routes, and third-party APIs for AI processing and authentication. This architecture ensures scalability, performance, and a streamlined developer experience.

## 2. Frontend Architecture

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **UI Library:** React
- **Styling:** Tailwind CSS with ShadCN UI components
- **State Management:** React Context and `useState` for local state; SWR for data fetching.
- **Key Libraries:**
  - `react-pdf`: For rendering PDF previews.
  - `mammoth`: For converting DOCX to HTML.
  - `lucide-react`: For icons.
  - `clsx`, `tailwind-merge`: For utility class management.

## 3. Backend Architecture

- **Framework:** Next.js API Routes
- **Runtime:** Node.js
- **AI Integration:** OpenRouter API for access to various large language models (e.g., DeepSeek R1).
- **Authentication (V2):** Supabase for user management and JWT-based auth.
- **Database (V2):** Supabase (PostgreSQL) for storing user data and optimization history.

## 4. Data Flow & Logic

### 4.1. Resume Optimization Flow

1.  **Client-Side:** User pastes resume and job description into the frontend.
2.  **API Request:** The frontend sends a POST request to `/api/optimize` with the two text inputs.
3.  **Backend Processing:**
    - The API route receives the request.
    - It constructs a detailed prompt using the user's input and a predefined template (the "Golden Prompt").
    - It sends this prompt to the OpenRouter API, specifying the desired AI model.
4.  **AI Response:** OpenRouter returns a JSON object containing the optimized resume.
5.  **API Response:** The Next.js API route parses the AI's response and sends it back to the client.
6.  **Client-Side:** The frontend displays the optimized resume to the user.

### 4.2. File Upload Flow

1.  **Client-Side:** User uploads a PDF or DOCX file.
2.  **API Request:** The file is sent to a dedicated API route (e.g., `/api/parse-file`).
3.  **Backend Processing:**
    - The API route uses `pdf-parse` or `mammoth` to extract raw text from the file.
4.  **API Response:** The extracted text is returned to the client.
5.  **Client-Side:** The text is then used in the optimization flow described above.

## 5. Deployment & DevOps

- **Hosting:** Vercel is used for continuous deployment, hosting, and serverless functions.
- **CI/CD:** Every `git push` to the `main` branch triggers an automatic build and deployment on Vercel.
- **Environment Variables:** Vercel's environment variable management is used to store API keys and other secrets securely.

## 6. Scalability & Performance

- **Serverless Functions:** Next.js API routes scale automatically with demand.
- **Edge Network:** Vercel deploys the application to a global edge network, ensuring low latency for users worldwide.
- **AI Model Selection:** The architecture allows for easy swapping of AI models via OpenRouter to balance cost, speed, and quality.