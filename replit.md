# GradRadar - Replit Development Guide

## Overview
GradRadar is a comprehensive tutor management platform designed to streamline student management, exam score tracking, session note-taking, homework assignment, and progress monitoring through analytics. The platform aims to enhance efficiency for tutors, provide transparency for parents, and support student success. It targets the educational technology market with a vision for intuitive and data-driven tutor management.

## User Preferences
Preferred communication style: Simple, everyday language.
Agent behavior: Be thorough and verify assumptions rather than pattern-matching or taking shortcuts. When uncertain, look up exact implementations rather than guessing. Signal clearly when making assumptions vs. when verifying facts.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Consistent design language with green gradients and rounded corners (CompSci High aesthetic), focus on clear visual hierarchy, calendar-style test countdowns with color-coded urgency, interactive charts (Recharts), and responsive layouts. Tabs and card-based layouts are used extensively for organization. Icons (Lucide React) are used for visual cues. Rich text editors support Markdown.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Email/password login with invite-only registration.
- **Session Management**: Express sessions with PostgreSQL for persistence, automatic logout/login flow for invitation acceptance.
- **API Design**: RESTful endpoints with consistent error handling.
- **Environment Configuration**: Production-ready URL generation with APP_URL environment variable and fail-fast validation.

### Database
- **Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM for type-safe operations
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless driver

### Key Features & Technical Implementations
- **Authentication System**: Single email-only authentication with production-grade security (rate limiting, CORS protection, session rotation, failed login lockout), PostgreSQL session persistence, secure cookies, user roles (Tutor, Parent, Student, Admin). Invitation system with automatic session management and proper URL generation for production deployment.
- **Student Management**: CRUD operations, detailed student profiles with personal, academic, and exam data.
- **Exam Score Tracking**: Supports various exams (SAT, ACT, AP, etc.), analytics with Recharts, goal tracking.
- **Session Notes**: Markdown support, structured templates, optional AI summary generation, parent communication features. Features inline note-taking with categorization (General, Company, Parent, Progress Notes).
- **Homework Management**: Status tracking, due dates, detailed descriptions.
- **Resource Library**: External link storage, per-student organization.
- **Alumni Tracker System**: Specialized system focusing on alumni data (name, class, track/persistence, GPA/income), photo uploads, and color-coded status indicators. Includes comprehensive CSV import/export with intelligent header mapping, validation, and duplicate handling.
- **Analytics Homepage**: Features a Path Status Heat Map, Economic Liberation Funnel visualizations (Success and Attrition), and Geographic Distribution with college mapping. Integrates live data, cohort filtering, and interactive elements.
- **Audit Logging**: Comprehensive logging of user actions and data changes, accessible to admin users.
- **Image Management**: Client-side image compression for avatar uploads, base64 storage, and consistent display across the application.
- **Contact Recency System**: Color-coded avatar rings indicating last contact date for alumni, with client-side calculation and filtering.
- **Inline Editing**: Many sections support inline editing for a seamless user experience.
- **Frozen Columns**: Excel-like column freezing with sticky positioning, allowing users to pin important columns (like names) while scrolling horizontally. Supports up to 4 frozen columns with visual indicators and group header handling.
- **Smart Contact Queue System**: Three-panel task management interface (25% queue, 35% workspace, 40% detail) with sophisticated 4-tier priority algorithm: Manual Assignment → Contact Slip → Track Slip → First Touch. Features intelligent alumni prioritization based on follow-up urgency, contact recency degradation, tracking status changes, and support needs. Enhanced with flowchart-based logic including: dynamic cooldown periods based on contact success (3-7 days), flexible snooze options (1,3,5,10,30 days), failed contact attempt priority boost, and 100-day safety net to prevent alumni from disappearing. Includes queue management actions (pin, snooze dropdown) with database persistence.

## External Dependencies

### Services
- **PostgreSQL Database**: Primary data storage.
- **OpenAI API**: AI-powered session summary generation (optional).
- **Twilio SMS**: SMS service for parent notifications.
- **Gmail SMTP / Resend API / SendGrid**: Email functionality and email-to-SMS gateways.

### Frontend Libraries
- **UI Components**: Radix UI primitives with shadcn/ui styling.
- **Charts**: Recharts for data visualization.
- **Forms**: React Hook Form with Zod validation.
- **Icons**: Lucide React icon library.
- **Markdown**: ReactMarkdown for rendering.

### Backend Libraries
- **Database**: Drizzle ORM with Neon serverless driver.
- **Authentication**: Passport.js with OpenID Connect strategy.
- **Validation**: Zod for runtime type checking.
- **Security**: bcrypt for password hashing.
- **CSV Processing**: Papa Parse for CSV import/export.
- **State Management (Client)**: Zustand for global state management.