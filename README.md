# Jenelle

Jenelle™ — a private decision-clarity SaaS for founders, built on a 12-dimensional business consciousness model.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI:** React 18

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ask-jenelle/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   ├── signin/        # Sign in page
│   │   └── signup/        # Sign up page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Shared React components
├── lib/                   # Utility functions and helpers
│   ├── auth/             # Authentication utilities
│   └── utils/            # General utilities
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

Copy `.env.example` to `.env.local` and configure as needed.

