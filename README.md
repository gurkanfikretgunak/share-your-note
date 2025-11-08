# Share Your Note

A real-time, Kahoot-like web application where attendees can join events managed by hosts to share notes, images, and emotions in real-time.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Backend & Database:** Supabase (Auth, PostgreSQL, Realtime, Storage)
- **UI Kit:** shadcn/ui
- **Styling:** Tailwind CSS
- **Animations:** React Confetti, CSS Animations

## Features

### Core Features

- **Anonymous Attendee Joining:** Attendees can join events with just a username
- **Real-time Updates:** Live feed of notes, images, and emotions using Supabase Realtime
- **Host Dashboard:** Create and manage events with QR codes
- **Broadcast Announcements:** Hosts can send real-time announcements to all attendees
- **Event Modes:** Three themed modes - General, Birthday, and Party
- **Image Upload:** Attendees can share images via Supabase Storage
- **QR Code Support:** Join events via QR code scanning

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

### Interactive Features

- **Mode Toggle Buttons:** Switch between General, Birthday, and Party modes on the home page
- **Dynamic Backgrounds:** Background changes based on selected mode
- **Smooth Transitions:** All mode changes include smooth animations
- **Responsive Design:** All effects work seamlessly on mobile and desktop

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

3. Enable Realtime for the `notes` and `participants` tables in Supabase Dashboard:
   - Go to Database > Replication
   - Enable replication for `notes` and `participants` tables

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

1. Navigate to `/auth/signup` to create an account
2. Sign in at `/auth/login`
3. Go to `/host/dashboard`
4. Click "Create New Event" and fill in the details
5. Select an event mode (General, Birthday, or Party)
6. Share the event code or QR code with attendees
7. Click "Start Event" when ready
8. Send announcements using the announcement input
9. View real-time feed of attendee submissions

### For Attendees

1. Go to the home page
2. **Select a mode** using the toggle buttons (General, Birthday, or Party) to customize your experience
3. Enter the event code or scan the QR code
4. Enter your name when prompted
5. Start sharing notes, images, or emotions!
6. Enjoy the visual effects based on the event mode

## Project Structure

```
/
├── app/
│   ├── page.tsx                    # Home page (attendee entry with mode selection)
│   ├── event/[event_code]/        # Event page for attendees
│   ├── host/
│   │   ├── dashboard/             # Host dashboard
│   │   └── layout.tsx             # Protected route wrapper
│   └── auth/                       # Authentication pages
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── qr-scanner.tsx             # QR code scanner
│   ├── event-feed.tsx             # Notes feed display
│   ├── host-announcement.tsx      # Host announcements
│   ├── image-upload.tsx           # Image upload component
│   └── event-theme.tsx            # Event mode theming
├── lib/
│   ├── supabase.ts                # Client-side Supabase client
│   ├── supabase-server.ts         # Server-side Supabase client
│   └── anonymous-auth.ts          # Anonymous user handling
├── supabase/
│   └── migrations/                # Database migrations
└── types/
    └── database.types.ts          # TypeScript types
```

## Database Schema

- **profiles:** User profiles (linked to auth.users or anonymous)
- **events:** Event information with codes and modes
- **participants:** Event participation mapping
- **notes:** Shared content (text, images, emotions)

## Notes

- Anonymous users are stored in the `profiles` table with generated UUIDs
- Event codes are 6-character alphanumeric strings
- Images are stored in Supabase Storage bucket `event-images`
- Real-time updates use Supabase Realtime subscriptions
- Host announcements use Supabase Broadcast channels
- Visual effects are optimized for performance and work on all modern browsers
- Mode selection on the home page is for preview only - actual event mode is set by the host
- Birthday mode includes floating balloons, abstract geometric shapes, and confetti
- Party mode features a full laser light show with rotating beams and pulsing grid

## License

MIT
