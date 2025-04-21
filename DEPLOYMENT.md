# Snake Game Deployment Guide

This multiplayer snake game uses a split deployment architecture:
- **Frontend**: Deployed on Netlify
- **Backend/Game Server**: Deployed on Render.com

## 1. Backend Deployment (Render.com)

### Option 1: Deploy using render.yaml (Recommended)

1. Push your code to GitHub
2. Login to Render.com
3. Go to the Dashboard and click "New" > "Blueprint"
4. Connect your repository
5. Render will automatically detect the `render.yaml` file and set up the service
6. After deployment, note the URL of your service (e.g. `https://snake-game-server.onrender.com`)
7. In the Render dashboard, add the environment variable:
   - `FRONTEND_URL`: Set to your Netlify URL (e.g. `https://your-app.netlify.app`)

### Option 2: Manual Setup

1. Login to Render.com
2. Click "New" > "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `snake-game-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run game-server`
   - **Add Environment Variables**:
     - `NODE_ENV`: `production`
     - `FRONTEND_URL`: Your Netlify URL

## 2. Frontend Deployment (Netlify)

1. Push your code to GitHub
2. Login to Netlify
3. Click "New site from Git"
4. Connect your repository
5. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`
   - **Add Environment Variables**:
     - `NEXT_PUBLIC_SOCKET_SERVER_URL`: Your Render.com service URL

## 3. Connect Supabase

Make sure your Supabase environment variables are set in your Netlify deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Testing the Deployment

1. Visit your Netlify site
2. Check the browser console for any connection errors
3. Verify that the game can connect to the socket server
4. Test multiplayer functionality

## Troubleshooting

### Socket Connection Issues
- Check that CORS is properly configured
- Verify environment variables are set correctly
- Check browser console for connection errors

### Authentication Issues
- Make sure Supabase is properly configured
- Enable email provider in Supabase dashboard

## Local Development

To run the entire stack locally:
```
# Terminal 1: Run the frontend
npm run dev

# Terminal 2: Run the backend
npm run dev:game-server
``` 