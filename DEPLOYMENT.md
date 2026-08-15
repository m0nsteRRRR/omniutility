# 🚀 OmniUtility Suite — Deployment Guide

Deploy the frontend to **Vercel** (free) and the yt-dlp backend to **Render.com** (free tier, no credit card required).

---

## Step 1 — Push to GitHub

The backend is configured to automatically deploy from GitHub using Render.

I have pushed the code to your GitHub repository for you! If you ever need to push updates in the future, run:
```powershell
git add .
git commit -m "Update"
git push
```

---

## Step 2 — Deploy Backend to Render.com (No Credit Card)

1. Go to **[Render.com](https://render.com/)** and sign up or log in using your GitHub account.
2. Once logged in, click **"New +"** and select **"Web Service"**.
3. Under "Connect a repository", click **Connect** next to your `omniutility` repository.
4. On the setup page, everything is pre-configured via the `render.yaml` file. Just confirm the settings:
   - **Name:** omniutility-backend
   - **Region:** Singapore (or closest to you)
   - **Branch:** main
   - **Runtime:** Docker
   - **Instance Type:** Free ($0/month)
5. Click **Create Web Service**.
6. Render will now build your Docker container. This will take a few minutes.
7. Once deployed, copy your backend URL from the top left (it will look like `https://omniutility-backend.onrender.com`).

---

## Step 3 — Deploy Frontend to Vercel

### 3a. Login to Vercel
Open your terminal and run:
```powershell
vercel login
```

### 3b. Deploy
```powershell
vercel --prod
```
When prompted:
- **Set up and deploy?** → Y
- **Which scope?** → Your personal account
- **Link to existing project?** → N
- **What's your project's name?** → `omniutility`
- **In which directory is your code?** → `./` (press Enter)
- **Want to modify settings?** → N

Vercel will build and deploy. You'll get a URL like:
```
https://omniutility.vercel.app
```

### 3c. Set the backend URL in Vercel
```powershell
vercel env add VITE_API_URL production
# When prompted, paste the Render URL you copied earlier:
https://omniutility-backend.onrender.com
```

Then redeploy to pick up the new env variable:
```powershell
vercel --prod
```

---

## Step 4 — Tell the Backend Your Vercel URL

To secure your backend, we need to tell Render what frontend URL is allowed to access it.
1. Go to your Web Service on Render dashboard.
2. Click **Environment** in the left menu.
3. Find the `ALLOWED_ORIGINS` variable.
4. Add your Vercel URL to the list (e.g., `https://omniutility.vercel.app,http://localhost:5173`).
5. Click **Save Changes**. Render will automatically restart your app with the new settings.

---

## ⚠️ Important Note About Render Free Tier
Render's free web services automatically "sleep" after 15 minutes of inactivity. When a user tries to download a video after the server has gone to sleep, it will take about **30–60 seconds** for the backend to wake up. This is normal for completely free hosting without a credit card. All other tools (PDF, Image, QR, etc.) run in the browser and will always be instant.
