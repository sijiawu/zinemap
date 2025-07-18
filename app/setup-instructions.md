# Mapbox Setup Instructions

To enable the interactive map functionality, you'll need to:

1. Sign up for a free Mapbox account at https://www.mapbox.com/
2. Get your public access token from your Mapbox dashboard
3. Add the token to your environment variables:

## For local development:
Create a `.env.local` file in your project root:
\`\`\`
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
\`\`\`

## For Vercel deployment:
Add the environment variable in your Vercel dashboard:
- Go to your project settings
- Navigate to Environment Variables
- Add `NEXT_PUBLIC_MAPBOX_TOKEN` with your token value

The map will show a fallback message if no token is provided.
