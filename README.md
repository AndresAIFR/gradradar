# GradRadar

A comprehensive AI-powered tutor management platform that helps tutors efficiently manage students, track progress, and generate personalized communications using advanced natural language processing.

## What It Does

GradRadar streamlines the tutoring business by providing tools to:
- **Manage Students**: Complete student profiles with academic details, test preferences, and contact information
- **Track Progress**: Visual score tracking for SAT, ACT, AP, and other standardized tests with progress analytics
- **Document Sessions**: Rich session notes with AI-powered summary generation
- **Assign Homework**: Organized homework management with due dates and status tracking
- **Communicate with Parents**: Automated email and SMS notifications with customizable AI-generated summaries
- **Monitor Analytics**: Visual progress charts and goal tracking

## Key Features

### 🎯 Student Management
- Complete student profiles with academic and personal information
- Support for multiple exam types (SAT, ACT, PSAT, AP, GRE, GMAT, etc.)
- Parent contact information and communication preferences
- Testimonials and progress tracking

### 📊 Score Tracking & Analytics
- Visual progress charts showing score improvements over time
- Mock vs. real exam differentiation
- Target score comparisons with color-coded progress indicators
- Comprehensive score history with editing capabilities

### 📝 Session Documentation
- Rich text session notes with markdown support
- AI-powered summary generation in three formats:
  - **Parent Email**: Professional email summaries (100-125 words)
  - **Parent Text**: Concise SMS summaries (≤300 characters)
  - **Company Summary**: Internal stakeholder reports (100-120 words)
- Lock/unlock functionality to prevent accidental overwrites

### 📚 Homework Management
- Assignment tracking with due dates and status
- Resource linking and chapter/page references
- Automatic homework extraction from session notes

### 💬 Smart Communications
- **Email**: Gmail integration for sending session summaries
- **SMS**: Twilio integration with carrier optimization
- **AI Generation**: Customizable prompts for different communication styles
- **Variable Substitution**: Dynamic tutor, student, and parent name insertion

### ⚙️ Customization
- AI prompt customization with live preview functionality
- Settings page with tabbed interface for different communication types
- Template variable system for personalized communications
- Profile management with editable contact information

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **Wouter** for lightweight routing
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Recharts** for data visualization

### Backend
- **Node.js** with Express.js
- **TypeScript** with ESM modules
- **Drizzle ORM** with PostgreSQL
- **Replit Auth** + Email/Password authentication
- **OpenAI GPT-4o** for AI generation

### Services
- **PostgreSQL**: Primary database
- **OpenAI API**: AI-powered content generation
- **Twilio**: SMS messaging
- **Gmail SMTP**: Email delivery
- **Replit Auth**: OAuth authentication

## Getting Started

1. **Clone and Setup**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Set up PostgreSQL database
   - Add OpenAI API key
   - Configure Twilio credentials (optional)
   - Set up Gmail SMTP (optional)

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Navigate to the provided URL
   - Sign in with Replit Auth or create email account
   - Start adding students and tracking progress

## Features in Detail

### AI-Powered Communications
The platform uses GPT-4o to generate three types of communications:
- **Parent Emails**: Professional summaries with session details, strengths, areas for improvement, and homework assignments
- **Parent Texts**: Concise SMS messages under 300 characters with structured format
- **Company Summaries**: Internal reports for stakeholders with session metrics and student progress

### Progress Tracking
Visual analytics show:
- Score progression over time with trend lines
- Target vs. actual performance comparisons
- Color-coded progress indicators (Green: target hit, Yellow: close to target, Red: needs improvement)
- Test countdown calendars with urgency indicators

### Session Management
Comprehensive session documentation includes:
- Topic coverage and duration tracking
- Strengths and weaknesses identification
- Homework assignment with due dates
- Private tutor notes and company observations
- AI summary generation with lock protection

## Architecture

Built with modern full-stack patterns:
- **Frontend-Heavy**: Maximum functionality in React with minimal backend dependency
- **Type-Safe**: End-to-end TypeScript with Drizzle ORM schema validation
- **Real-Time**: Optimistic updates and query invalidation for responsive UI
- **Modular**: Component-based architecture with reusable UI elements
- **Scalable**: Database-backed sessions and efficient query patterns

## Contributing

The codebase follows modern React patterns with comprehensive TypeScript coverage. Key architectural decisions and recent changes are documented in `replit.md`.

---

*Built for tutors who want to focus on teaching while technology handles the administrative work.*