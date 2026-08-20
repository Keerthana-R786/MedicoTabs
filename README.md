# MedicoTabs EHR System

A professional Electronic Health Records (EHR) system with YOXA Multiagent Workflow integration for medical referral lifecycle management.

## Features

### Core Features
- **Patient Records Management**: Create, search, and manage patient information
- **Flight Tracker**: Real-time tracking of patient visit lifecycle from creation to completion
- **Referral System**: Create and manage specialist referrals with multiagent workflow
- **Document Management**: Upload, view, and download patient documents
- **Two-way Communication**: Messaging between primary and specialist doctors
- **HITL Approvals**: Human-in-the-loop approval system integrated with YOXA workflow
- **Coverage Verification**: Insurance eligibility and pre-authorization tracking
- **Dashboard**: Real-time statistics and activity monitoring

### YOXA Multiagent Workflow Integration

The system integrates with YOXA's 5-stage referral lifecycle workflow:

1. **Create and Route**: FHIR-based referral creation and specialist routing
2. **Acceptance and Records**: Specialist acceptance and targeted document exchange
3. **Coverage Verification**: Insurance eligibility and pre-approval
4. **Scheduling and Attendance**: Appointment booking and attendance confirmation
5. **Completion and Archive**: Doctor sign-off and medical history archival

Each stage is automated by specialized agents with real-time tracking visible in the Flight Tracker.

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS (light theme)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Build Tool**: Vite
- **State Management**: React Context API
- **Backend Integration**: Axios (ready for Supabase)

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Add your Supabase credentials to `.env` (when ready):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Demo Credentials

Use these credentials to log in:

**Primary Doctor:**
- Email: `dr.smith@northharbor.com`
- Password: any

**Specialist Doctor:**
- Email: `dr.shah@lakeside.com`
- Password: any

## Project Structure

```
src/
├── components/
│   ├── FlightTracker/       # Flight tracker visualization
│   └── Layout/              # Sidebar, Header
├── contexts/
│   └── AuthContext.tsx      # Authentication context
├── data/
│   └── mockDatabase.ts      # Mock data for development
├── pages/
│   ├── Dashboard.tsx        # Main dashboard
│   ├── Patients.tsx         # Patient list
│   ├── PatientDetail.tsx    # Patient details with tabs
│   ├── CreateReferral.tsx   # Referral creation form
│   ├── Approvals.tsx        # HITL approval interface
│   └── Login.tsx            # Authentication
├── services/
│   ├── api.ts               # API service layer (for Supabase)
│   └── mockAPI.ts           # Mock API for development
├── types/
│   └── index.ts             # TypeScript interfaces
├── App.tsx                  # Main app component
└── main.tsx                 # Entry point
```

## Key Workflows

### Creating a Referral

1. Navigate to a patient's detail page
2. Click "Create Referral"
3. Fill out:
   - Requested specialty
   - Referral reason
   - Service type (optional)
   - Urgency level (Routine/Urgent/Emergency)
4. Submit to trigger the YOXA multiagent workflow

The workflow automatically:
- Routes to appropriate specialist
- Sends specialist alerts
- Exchanges documents
- Verifies coverage
- Schedules appointments
- Tracks completion

### Flight Tracker

Track patient visit lifecycle in real-time:

1. Click "Start Tracking" on patient detail page
2. View 5-stage progress with agent actions
3. Each stage shows:
   - Status (pending/in_progress/completed/failed)
   - Agent actions and timestamps
   - Tool invocations and results
   - Notes and completion times

### Doctor Sign-off

When a referral reaches completion:

1. Check "Approvals" section
2. Review the HITL approval request
3. Select outcome:
   - Patient Recovered - Sign Off
   - Treatment Complete - Ongoing Care
   - Requires Follow-up
4. Or provide custom response

The workflow resumes automatically after sign-off.

## YOXA Backend Integration

### Environment Variables (Backend)

The backend requires these YOXA integration variables:

```bash
YOXA_TRIGGER_URL=               # YOXA trigger endpoint
YOXA_DEPLOYMENT_SECRET=         # Authentication secret
YOXA_HITL_WEBHOOK_SIGNING_SECRET=  # HITL webhook verification
YOXA_HITL_RESPONSE_SECRET=      # HITL response authentication
```

### API Endpoints

The system expects these backend endpoints:

- `POST /api/referrals` - Creates referral and triggers YOXA workflow
- `POST /api/hitl/webhook` - Receives YOXA HITL events
- `POST /api/hitl/:requestId/respond` - Sends HITL responses to YOXA

### Webhook Integration

YOXA sends approval requests to:
```
POST /api/hitl/webhook
Headers:
  X-Yoxa-Webhook-Id: <event_id>
  X-Yoxa-Webhook-Timestamp: <timestamp>
  X-Yoxa-Webhook-Signature: v1=<hmac>
```

The backend verifies the signature and persists approval requests.

## Mock Data

The application includes comprehensive mock data:
- 3 users (primary doctor, specialist, coordinator)
- 3 patients with complete records
- Sample referrals with workflow states
- Flight trackers showing agent actions
- HITL approval requests
- Documents and messages

This allows full frontend development without a backend.

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Next Steps

1. **Backend Development**: Implement the backend API with Supabase
2. **YOXA Integration**: Configure the YOXA workflow and secrets
3. **File Storage**: Set up Supabase Storage for documents
4. **Authentication**: Implement Supabase Auth
5. **Real-time Updates**: Add Supabase Realtime for live tracker updates
6. **Testing**: Add comprehensive test coverage
7. **Deployment**: Deploy to production environment

## Support

For YOXA integration questions, refer to:
- `deployment-helper/SKILL.md` - Integration guide
- `deployment-helper/references/` - Detailed reference docs
