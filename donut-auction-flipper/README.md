# Donut Auction Flipper

Find the best flips on DonutSMP's auction house. Modern UI with Next.js App Router + Tailwind.

Getting started:

1. Install dependencies:
   npm install

2. Run dev server:
   npm run dev

3. Open http://localhost:3000

API Key:
- Paste your DonutSMP API key in the Settings page. The API key is sent as `x-donut-api-key` to the serverless API route which can then call the real DonutSMP endpoint.
- Configure `DONUT_AH_ENDPOINT` and optionally `DONUT_API_KEY` in `.env.local` if you prefer server-side secrets.

Notes:
- At the moment the server uses mock data until `DONUT_AH_ENDPOINT` is set. Replace `fetchDonutListings` with the real API once available.

