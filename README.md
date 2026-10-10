# Opportunity Hub

A platform for discovering and sharing opportunities.

## Features

- Search and filter opportunities by keyword, category, location, and type
- Browse curated jobs, internships, and projects
- Save favorite openings and track them locally
- Responsive layout designed for desktop and mobile
- Live metrics for open positions and remote roles

## Files

- `index.html` — app structure and layout
- `styles.css` — styling and responsive design
- `script.js` — mock data, filtering logic, and interactivity
- `details.html` and `details.js` — opportunity detail page
- `data.js` — opportunity dataset

## Supabase setup

This app now supports Supabase for employer accounts and job listing persistence.

1. Create a new Supabase project.
2. Copy `.env.example` to `.env` and fill in your project details.
3. Run the SQL from `supabase-schema.sql` in the Supabase SQL editor.
4. Start the app with:

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Notes

This is a front-end static website using mock data and browser `localStorage` for saved items. The backend can persist employers and listings through Supabase when configured; without Supabase, it falls back to the local `data/*.json` files for backwards compatibility.

## Deployment

Because it is a static site, it can be hosted on GitHub Pages, Netlify, Vercel, or any simple web server.
