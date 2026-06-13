## Break-in Workflow

This app manages break-in work requests and work removal requests through Planner, Coordinator, Superintendent, and Manager approvals using Supabase as the system of record.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Required Env Vars

Core app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_COOKIE_SECRET`
- `ALLOWED_EMAIL_DOMAINS`
- `SHUTDOWN_ADMIN_ACTIONS_ENABLED` - set to `true` only when you want the Excel export and clear-for-next-shutdown controls visible.

Email approval flow:

- `APP_BASE_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `PLANNER_APPROVER_EMAILS`
- `COORDINATOR_APPROVER_EMAILS`
- `SUPERINTENDENT_APPROVER_EMAILS`
- `MANAGER_APPROVER_EMAILS`
- `APPROVED_NOTIFICATION_EMAILS`

Example:

```env
APP_BASE_URL=https://your-app-url.example.com
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Break-in Workflow <workflow@yourdomain.com>
PLANNER_APPROVER_EMAILS=planner1@greatland.com.au,planner2@greatland.com.au
COORDINATOR_APPROVER_EMAILS=coordinator@greatland.com.au
SUPERINTENDENT_APPROVER_EMAILS=superintendent@greatland.com.au
MANAGER_APPROVER_EMAILS=manager@greatland.com.au
APPROVED_NOTIFICATION_EMAILS=operations@greatland.com.au,supervisors@greatland.com.au
```

## Email Flow

- New requests email the Planner group.
- Planner approval emails the Coordinator group.
- Coordinator approval emails the Superintendent group.
- Superintendent approval emails the Manager group.
- Manager approval or any rejection emails the requestor.
- Manager approval also emails the approved-work notification group.
- Work removal requests follow the same approval chain and use their own request and dashboard pages.
- Late work requests use Planner, Coordinator, and Superintendent approval only. Superintendent approval is final.

Approval emails use signed links and do not require login.

## Deliverability Notes

- Verify the `EMAIL_FROM` domain in Resend.
- If corporate mail filters delay or quarantine messages, ask IT to allowlist the sender domain and address.
- The app sends both HTML and plain-text email content to improve compatibility with corporate mail systems.
