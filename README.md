# Share Your Note

A real-time, Kahoot-like web application where attendees can join events managed by hosts to share notes, images, and emotions in real-time.

## Tech Stack Badges

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Built with Cursor](https://img.shields.io/badge/Built%20with-Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Backend & Database:** Supabase (Auth, PostgreSQL, Realtime, Storage)
- **UI Kit:** shadcn/ui
- **Styling:** Tailwind CSS
- **Animations:** React Confetti, CSS Animations
- **Internationalization:** next-intl (Turkish & English support)

## Screenshots

<div align="center">
  <img src="docs/images/share-your-note%20-%201.png" alt="Share Your Note Screenshot 1" width="800"/>
  <img src="docs/images/share-your-note%20-%202.png" alt="Share Your Note Screenshot 2" width="800"/>
  <img src="docs/images/share-your-note%20-%203.png" alt="Share Your Note Screenshot 3" width="800"/>
  <img src="docs/images/share-your-note%20-%204.png" alt="Share Your Note Screenshot 4" width="800"/>
</div>

## Features

### Core Features

- **Internationalization (i18n):** Full Turkish and English language support with URL-based routing (`/tr/...`, `/en/...`)
- **Language Switcher:** Easy language switching available on all pages
- **Anonymous Attendee Joining:** Attendees can join events with just a username
- **Real-time Updates:** Live feed of notes, images, and emotions using Supabase Realtime
- **Host Dashboard:** Create and manage events with QR codes
- **Broadcast Announcements:** Hosts can send real-time announcements to all attendees
- **Event Modes:** Three themed modes - General, Birthday, and Party
- **Image Upload:** Attendees can share images via Supabase Storage
- **QR Code Support:** Join events via QR code scanning
- **Event Status Management:** Hosts can set events to pending, active, or finished status
- **Message Management:** Hosts can delete messages and favorite important ones
- **Like System:** Attendees can like messages from other participants
- **Consent Management:** GDPR, policy, cookie, and event data sharing consents for participants
- **Event Title Editing:** Hosts can edit event titles anytime
- **Event Restart:** Hosts can restart finished events
- **Statistics Dashboard:** Hosts can view total messages, likes, and image messages

### Visual Effects & Animations

#### 🎂 Birthday Mode
- **Floating Balloons:** Animated balloons (🎈, 🎉, 🎊, 🎁) floating across the screen
- **Abstract Objects:** 15 animated geometric shapes (circles, triangles, squares, stars) with:
  - Smooth floating animations
  - Rotating effects
  - Glowing shadows
  - Colorful gradients (pink, yellow, orange tones)
- **Confetti Explosion:** Colorful confetti particles on mode activation
- **Pink-Yellow Gradient Background:** Festive color scheme

#### 🎉 Party Mode
- **Laser Light Show:**
  - 8 static laser beams at different angles (45° intervals)
  - 4 rotating laser beams from center
  - Pulsing laser grid (horizontal and vertical lines)
  - Neon colors (purple, blue, pink, cyan, yellow)
  - Smooth animations and glow effects
- **Sparkling Stars:** Animated star emojis (✨, ⭐, 🎆, 🎇, 💫, 🌟) across the screen
- **Confetti Rain:** Enhanced confetti with more particles
- **Purple-Blue Gradient Background:** Energetic color scheme

#### ✨ General Mode
- Clean, minimalist white background
- No visual effects for professional use

### Host Features

- **Event Creation:** Create events with custom titles and modes
- **Event Status Control:** Start, pause, end, and restart events
- **Message Management:**
  - Delete inappropriate messages
  - Favorite important messages (highlighted with yellow border)
  - View like counts on all messages
- **Event Customization:**
  - Edit event titles anytime
  - Set event modes (General, Birthday, Party)
- **QR Code Generation:** Automatic QR code generation for easy sharing (includes locale in URL)
- **Real-time Announcements:** Broadcast messages to all attendees
- **Participant Monitoring:** View all attendees and their submissions in real-time
- **Statistics Dashboard:** View real-time statistics:
  - Total messages count
  - Total likes received
  - Number of image messages

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run all migration files in order from `supabase/migrations/`:
   - `001_profiles.sql`
   - `002_events.sql`
   - `003_participants.sql`
   - `004_notes.sql`
   - `005_realtime_policies.sql`
   - `006_storage_bucket.sql`
   - `011_consents.sql`
   - `012_host_delete_notes.sql`
   - `013_add_favorited_notes.sql`
   - `014_note_likes.sql`

3. Enable Realtime for the following tables in Supabase Dashboard:
   - Go to Database > Replication
   - Enable replication for `notes`, `participants`, and `note_likes` tables

4. Create a storage bucket named `event-images`:
   - Go to Storage in Supabase Dashboard
   - Create a new bucket named `event-images`
   - Set it to public

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

You can find these values in your Supabase project settings under API.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Hosts

1. Navigate to `/[locale]/auth/signup` (e.g., `/tr/auth/signup` or `/en/auth/signup`) to create an account
2. Sign in at `/[locale]/auth/login`
3. Go to `/[locale]/host/dashboard`
4. Click "Create New Event" and fill in the details
5. Select an event mode (General, Birthday, or Party)
6. Share the event code or QR code with attendees (QR code includes locale)
7. Click "Start Event" when ready
8. **Manage Messages:**
   - Favorite important messages (star icon)
   - Delete inappropriate messages (trash icon)
   - View like counts on messages
9. **View Statistics:**
   - See total messages, likes, and image messages in real-time
10. **Edit Event:**
    - Click the edit icon next to the event title to change it
11. **Control Event Status:**
    - Pause event (sets to pending)
    - End event (sets to finished)
    - Restart finished events
12. Send announcements using the announcement input
13. View real-time feed of attendee submissions
14. **Change Language:** Use the language switcher in the header to switch between Turkish and English

### For Attendees

1. Go to the home page (`/tr` for Turkish or `/en` for English)
2. **Change Language:** Use the language switcher in the top-right corner
3. **Select a mode** using the toggle buttons (General, Birthday, or Party) to customize your experience
4. Enter the event code or scan the QR code
5. **Accept Consents:** Accept GDPR, policy, cookie, and event data sharing consents
6. Enter your name when prompted
7. Start sharing notes, images, or emotions!
8. **Interact with Messages:**
   - Like messages from other participants (heart icon)
   - See like counts on all messages
   - View favorited messages highlighted at the top
9. Enjoy the visual effects based on the event mode
10. Note: You cannot join events that are pending or finished

## Project Structure

```
/
├── app/
│   ├── [locale]/                    # Locale-based routing (tr, en)
│   │   ├── page.tsx                 # Home page (attendee entry with mode selection)
│   │   ├── event/[event_code]/      # Event page for attendees
│   │   ├── host/
│   │   │   ├── dashboard/           # Host dashboard
│   │   │   └── layout.tsx           # Protected route wrapper
│   │   └── auth/                    # Authentication pages
│   ├── layout.tsx                    # Root layout
│   └── globals.css                  # Global styles
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── qr-scanner.tsx               # QR code scanner
│   ├── event-feed.tsx               # Notes feed display
│   ├── host-announcement.tsx        # Host announcements
│   ├── image-upload.tsx             # Image upload component
│   ├── event-theme.tsx              # Event mode theming
│   └── language-switcher.tsx        # Language switcher component
├── i18n/
│   ├── routing.ts                    # i18n routing configuration
│   └── request.ts                   # i18n request configuration
├── messages/
│   ├── tr.json                      # Turkish translations
│   └── en.json                      # English translations
├── lib/
│   ├── supabase.ts                  # Client-side Supabase client
│   ├── supabase-server.ts           # Server-side Supabase client
│   └── anonymous-auth.ts            # Anonymous user handling
├── middleware.ts                    # Next.js middleware for locale routing
├── supabase/
│   └── migrations/                  # Database migrations
└── types/
    └── database.types.ts             # TypeScript types
```

## Database Schema

- **profiles:** User profiles (linked to auth.users or anonymous)
- **events:** Event information with codes, modes, and status (pending, active, finished)
- **participants:** Event participation mapping
- **notes:** Shared content (text, images, emotions) with favorite status
- **consents:** User consent records (GDPR, policy, cookie, event data sharing)
- **note_likes:** Like records for messages (participant_id, note_id)

## Notes

- **Internationalization:** Default language is Turkish (tr). All routes are prefixed with locale (`/tr/...`, `/en/...`). Language switcher is available on all pages.
- Anonymous users are stored in the `profiles` table with generated UUIDs
- Event codes are 6-character alphanumeric strings
- Events have three statuses: `pending`, `active`, `finished`
- Images are stored in Supabase Storage bucket `event-images`
- Real-time updates use Supabase Realtime subscriptions
- Host announcements use Supabase Broadcast channels
- Visual effects are optimized for performance and work on all modern browsers
- Mode selection on the home page is for preview only - actual event mode is set by the host
- Birthday mode includes floating balloons, abstract geometric shapes, and confetti
- Party mode features a full laser light show with rotating beams and pulsing grid
- **Consent Management:** All participants must accept GDPR, policy, cookie, and event data sharing consents before joining
- **Message Management:** Hosts can favorite messages (appears at top with yellow border) and delete inappropriate content
- **Like System:** Participants can like messages, with real-time like count updates
- **Event Control:** Hosts can pause, end, and restart events, controlling participant access
- **Title Editing:** Hosts can edit event titles anytime from the dashboard
- **Statistics:** Hosts can view real-time statistics (total messages, likes, image messages) in the dashboard
- Participants cannot join events with `pending` or `finished` status
- Favorited messages are sorted to the top of the feed
- Like counts are displayed with a heart icon next to each message
- **Home Page Layout:** Buttons are organized in a container card, footer is displayed as a single line at the bottom

## License

MIT
