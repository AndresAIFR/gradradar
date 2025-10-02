# GradRadar Codebase Inventory

> Complete file-by-file breakdown of the entire application. Use this as a navigation guide for understanding the codebase structure, locating specific functionality, and making informed changes.

## 📁 Root Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, and project metadata |
| `vite.config.ts` | Frontend build configuration |
| `drizzle.config.ts` | Database ORM configuration |
| `tailwind.config.ts` | CSS framework configuration |
| `tsconfig.json` | TypeScript compiler settings |
| `components.json` | shadcn/ui component configuration |
| `replit.md` | High-level architecture documentation |

## 🎨 Frontend (`client/src/`)

### 🏠 Core Application Files
| File | Purpose |
|------|---------|
| `App.tsx` | Main application component with routing |
| `main.tsx` | React application entry point |
| `index.css` | Global styles and CSS variables |

### 📄 Pages (`pages/`)
| File | Purpose |
|------|---------|
| `Alumni.tsx` | Main alumni listing with filters and sheets view |
| `AlumniDetail.tsx` | Individual alumni profile and interaction history |
| `Analytics.tsx` | Dashboard with charts and data visualizations |
| `ContactQueue.tsx` | Task management interface for alumni outreach |
| `Dashboard.tsx` | Overview page with quick stats |
| `Data.tsx` | Data management and import/export functions |
| `Students.tsx` | Student management (original tutor system) |
| `Settings.tsx` | User preferences and account settings |
| `Landing.tsx` | Welcome/login page |
| `AddAlumni.tsx` | Manual alumni creation form |
| `ContactTimeline.tsx` | Contact history visualization |
| `Calendar.tsx` | Schedule and event management |
| `Reports.tsx` | Report generation and templates |
| `ReportsNew.tsx` | Enhanced reporting interface |
| `AcceptInvitation.tsx` | User invitation acceptance flow |
| `ResetPassword.tsx` | Password reset functionality |
| `VerifyEmail.tsx` | Email verification process |
| `PendingResolution.tsx` | Data conflicts requiring manual review |
| `DropoutDateAdmin.tsx` | Admin tool for dropout date management |
| `AlumniListDemo.tsx` | Demo/testing page |
| `not-found.tsx` | 404 error page |

### 🧩 Core Components (`components/`)

#### 📊 Alumni Management
| File | Purpose |
|------|---------|
| `AlumniSheetsView.tsx` | **CRITICAL**: Main data grid for alumni display |
| `AlumniHeader.tsx` | Alumni page header with filters and actions |
| `AlumniPicker.tsx` | Alumni selection dropdown component |
| `StatusButton.tsx` | Alumni tracking status indicator |
| `StatusPopover.tsx` | Status change interface |
| `SupportNeedsIcon.tsx` | Visual indicator for support requirements |

#### 📥 Import System (`ImportWizard/`)
| File | Purpose |
|------|---------|
| `ImportWizard.tsx` | **CRITICAL**: Main CSV import orchestrator |
| `steps/FileUploadStep.tsx` | CSV file selection and validation |
| `steps/ColumnMappingStep.tsx` | Map CSV headers to database fields |
| `steps/CollegeResolutionStepSimple.tsx` | **CRITICAL**: College name mapping and categorization |
| `steps/ImportConfirmationStep.tsx` | **CRITICAL**: Final data processing and distribution |
| `steps/ValidationReviewStep.tsx` | Data quality checks and error review |
| `steps/DataTransformationStep.tsx` | Data cleanup and standardization |
| `steps/AIAnalysisStep.tsx` | AI-powered data extraction |
| `steps/CollegeResolutionStep.tsx` | Advanced college resolution (legacy) |
| `SimpleMappingRow.tsx` | Individual mapping row component |
| `SimpleMappingRowClean.tsx` | Clean mapping row interface |

#### 📋 Data Management (`DataTable/`)
| File | Purpose |
|------|---------|
| `DataTable.tsx` | Reusable data table with sorting/filtering |
| `ColumnManager.tsx` | Column visibility and organization |
| `BulkOperations.tsx` | Batch actions on selected rows |
| `ExportButton.tsx` | Data export functionality |
| `FilterPresets.tsx` | Saved filter configurations |
| `DataInsights.tsx` | Table-level analytics and summaries |
| `index.ts` | Module exports |

#### ✏️ Inline Editing (`InlineEdit/`)
| File | Purpose |
|------|---------|
| `InlineTextField.tsx` | Editable text fields |
| `InlineSelectField.tsx` | Dropdown selection editors |
| `InlineBooleanField.tsx` | Checkbox/toggle editors |
| `InlineCollegeField.tsx` | Specialized college name editor |
| `index.ts` | Module exports |

#### 📈 Reports (`Reports/`)
| File | Purpose |
|------|---------|
| `ReportBuilder.tsx` | Custom report creation interface |
| `ReportDashboard.tsx` | Report viewing and management |
| `AutomatedReports.tsx` | Scheduled report configuration |

#### 🎛️ UI Components (`ui/`)
*shadcn/ui components - reusable design system elements*
| File | Purpose |
|------|---------|
| `button.tsx` | Button variations |
| `card.tsx` | Card containers |
| `dialog.tsx` | Modal dialogs |
| `form.tsx` | Form components with validation |
| `table.tsx` | Table structures |
| `tabs.tsx` | Tabbed interfaces |
| `alert.tsx` | Notification messages |
| `toast.tsx` | Toast notifications |
| `dropdown-menu.tsx` | Dropdown menus |
| `popover.tsx` | Popover overlays |
| `avatar.tsx` | User profile images |
| `badge.tsx` | Status badges |
| `progress.tsx` | Progress indicators |
| *...and other UI primitives* |

#### 🔧 Specialized Components
| File | Purpose |
|------|---------|
| `ExcelLikeDataTable.tsx` | Advanced spreadsheet-style data grid |
| `EditableCard.tsx` | Inline-editable card containers |
| `CopyToImageButton.tsx` | Screenshot/image export functionality |
| `AppLayout.tsx` | Main application layout wrapper |
| `Sidebar.tsx` | Navigation sidebar |
| `PageHeader.tsx` | Consistent page headers |
| `EmailAuthForms.tsx` | Authentication form components |
| `ProfileTab.tsx` | User profile management |
| `AccountInfo.tsx` | Account information display |
| `PasswordSection.tsx` | Password management |
| `DangerZone.tsx` | Destructive actions interface |
| `DeleteDataDialog.tsx` | Data deletion confirmation |

#### 📝 Notes & Communication
| File | Purpose |
|------|---------|
| `InlineNoteForm.tsx` | Quick note-taking interface |
| `GeneralNoteCard.tsx` | Note display component |
| `GeneralNoteModal.tsx` | Full note editing modal |
| `NotesCard.tsx` | Notes section container |
| `AddNoteSelector.tsx` | Note type selection |
| `InteractionCard.tsx` | Communication history display |
| `SessionLogCard.tsx` | Session record display |
| `SessionSummaryTabs.tsx` | Session summary organization |
| `SessionConfirmationDialogs.tsx` | Session action confirmations |

#### 🎓 Education & Career
| File | Purpose |
|------|---------|
| `EducationTab.tsx` | Academic information management |
| `EmploymentTab.tsx` | Employment history management |
| `EmploymentHistorySection.tsx` | Job history display |
| `OverviewTab.tsx` | Summary information view |
| `LiberationPathCard.tsx` | Educational pathway visualization |
| `CollegePicker.tsx` | College selection interface |
| `InlineScholarshipManager.tsx` | Scholarship tracking |

#### 📊 Analytics & Visualization
| File | Purpose |
|------|---------|
| `ChartProgressSplit.tsx` | Progress split charts |
| `ProgressCircle.tsx` | Circular progress indicators |
| `SingleSubjectChart.tsx` | Individual subject visualization |
| `ScoreProgressCard.tsx` | Test score progress display |
| `ScoreProgressTabs.tsx` | Score progress organization |
| `ScoreModal.tsx` | Score editing interface |
| `TestimonialsCard.tsx` | Alumni testimonials display |
| `GradRadarBrandCard.tsx` | Brand/marketing card |

#### 🔄 Import/Export & Data
| File | Purpose |
|------|---------|
| `ImportExportModal.tsx` | Data import/export interface |
| `PendingResolutionModal.tsx` | Data conflict resolution |
| `AuditLogSidebar.tsx` | Change history tracking |
| `FloatingReportsPanel.tsx` | Quick report access |

#### 🎯 Student Management (Legacy)
| File | Purpose |
|------|---------|
| `StudentListCard.tsx` | Student list display |
| `EditStudentModalEnhanced.tsx` | Student profile editor |
| `EditSectionModal.tsx` | Section editing interface |
| `AddResourceModal.tsx` | Resource addition interface |
| `SubjectPills.tsx` | Subject tag display |

### 🎣 Custom Hooks (`hooks/`)
| File | Purpose |
|------|---------|
| `useAuth.ts` | Authentication state management |
| `useInlineEdit.ts` | Inline editing functionality |
| `useUpdateAlumniField.ts` | Alumni field update operations |
| `useLastViewedAlumni.ts` | Navigation history tracking |
| `useCopyToImage.ts` | Image export functionality |
| `use-toast.ts` | Toast notification management |
| `use-mobile.tsx` | Mobile device detection |

### 🛠️ Utilities (`lib/` & `utils/`)

#### Core Libraries (`lib/`)
| File | Purpose |
|------|---------|
| `queryClient.ts` | **CRITICAL**: API client and TanStack Query setup |
| `queryKeys.ts` | Query key management |
| `utils.ts` | **CRITICAL**: General utility functions |
| `authUtils.ts` | Authentication helpers |

#### Specialized Utilities (`utils/`)
| File | Purpose |
|------|---------|
| `alumniHelpers.ts` | Alumni-specific utility functions |
| `contactRecency.ts` | Contact date calculations |
| `contactQueueAlgorithm.ts` | **CRITICAL**: Queue prioritization logic |
| `attritionCalculations.ts` | Dropout analysis calculations |
| `clientCollegeService.ts` | College data management |
| `collegeServiceAdapter.ts` | College service integration |
| `fieldLabels.ts` | UI field label definitions |
| `phoneFormat.ts` | Phone number formatting |

### 🏪 State Management (`store/`)
| File | Purpose |
|------|---------|
| `useLastViewedStore.ts` | Recently viewed alumni tracking |

### 🎯 Constants & Types
| File | Purpose |
|------|---------|
| `constants/examTypes.ts` | Exam type definitions |
| `types/user.ts` | User type definitions |

## 🖥️ Backend (`server/`)

### 🎯 Core Backend Files
| File | Purpose |
|------|---------|
| `index.ts` | **CRITICAL**: Express server setup and startup |
| `routes.ts` | **CRITICAL**: All API endpoints and business logic |
| `storage.ts` | **CRITICAL**: Database operations and queries |
| `db.ts` | Database connection and configuration |
| `vite.ts` | Vite development server integration |

### 🔐 Authentication & Email
| File | Purpose |
|------|---------|
| `emailAuth.ts` | Email-based authentication logic |
| `emailService.ts` | Email sending functionality |
| `emailToSmsService.ts` | Email-to-SMS gateway integration |
| `smsService.ts` | SMS messaging service |

### 🏫 Specialized Services
| File | Purpose |
|------|---------|
| `collegeResolutionService.ts` | **CRITICAL**: College name matching and resolution |
| `initDb.ts` | Database initialization and seeding |

### 🛡️ Middleware (`middleware/`)
| File | Purpose |
|------|---------|
| `cors.ts` | Cross-origin request configuration |
| `rateLimiting.ts` | API rate limiting protection |

### 📁 Static Assets (`public/`)
| File | Purpose |
|------|---------|
| `index.html` | Frontend entry point |
| `debug.html` | Development debugging page |
| `assets/` | Built frontend assets |

### 🔧 Utility Scripts
| File | Purpose |
|------|---------|
| `routes-simple.ts` | Simplified routing (development) |
| `start.mjs` | Production server startup script |

## 📊 Shared (`shared/`)

| File | Purpose |
|------|---------|
| `schema.ts` | **CRITICAL**: Database schema and type definitions |
| `autoCalculation.ts` | Automated field calculations |
| `liberationPath.ts` | Educational pathway logic |
| `alumniNotePrompts.ts` | AI prompt templates for notes |
| `defaultPrompts.ts` | Default text templates |
| `schema-backup.ts` | Schema backup for recovery |

## 🎯 Critical Files for Common Tasks

### 🔍 **Data Display Issues**
- `client/src/components/AlumniSheetsView.tsx` - Main data grid display logic
- `shared/schema.ts` - Database field definitions
- `server/storage.ts` - Data retrieval queries

### 📥 **Import Problems**
- `client/src/components/ImportWizard/steps/ImportConfirmationStep.tsx` - Final data processing
- `client/src/components/ImportWizard/steps/CollegeResolutionStepSimple.tsx` - College mapping
- `server/collegeResolutionService.ts` - College name matching
- `server/routes.ts` - Import API endpoint

### 🔄 **API Issues**
- `server/routes.ts` - All API endpoints
- `client/src/lib/queryClient.ts` - API client setup
- `server/storage.ts` - Database operations

### 🎨 **UI/Styling Changes**
- `client/src/index.css` - Global styles
- `client/src/components/ui/` - Reusable UI components
- `tailwind.config.ts` - CSS framework configuration

### 📊 **Database Changes**
- `shared/schema.ts` - Schema definitions
- `drizzle.config.ts` - ORM configuration
- `server/db.ts` - Database connection

---

## 📋 Quick Navigation by Feature

| Feature | Key Files |
|---------|-----------|
| **Alumni Listing** | `Alumni.tsx`, `AlumniSheetsView.tsx`, `AlumniHeader.tsx` |
| **CSV Import** | `ImportWizard.tsx`, `ImportConfirmationStep.tsx`, `CollegeResolutionStepSimple.tsx` |
| **Contact Queue** | `ContactQueue.tsx`, `contactQueueAlgorithm.ts` |
| **Data Grid** | `AlumniSheetsView.tsx`, `ExcelLikeDataTable.tsx` |
| **Authentication** | `emailAuth.ts`, `useAuth.ts`, `EmailAuthForms.tsx` |
| **College Resolution** | `collegeResolutionService.ts`, `CollegeResolutionStepSimple.tsx` |
| **API Endpoints** | `routes.ts`, `queryClient.ts` |
| **Database Schema** | `schema.ts`, `storage.ts` |

> **File Location**: `CODEBASE_INVENTORY.md` (root directory)
> **Purpose**: Complete navigation guide for developers and AI assistants working on the GradRadar codebase.