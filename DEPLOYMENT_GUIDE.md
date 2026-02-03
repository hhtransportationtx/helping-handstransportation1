# Deployment Guide - Helping Hands Transportation

This guide will walk you through deploying your application and connecting your domain.

## Option 1: Deploy to Vercel (Recommended - Easiest)

### Step 1: Sign up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" and connect your GitHub, GitLab, or Bitbucket account

### Step 2: Import Your Project
1. Click "Add New Project"
2. Select "Import Git Repository"
3. Connect to your repository or upload the project folder
4. Vercel will auto-detect it's a Vite project

### Step 3: Configure Environment Variables
Before deploying, add these environment variables in Vercel:

```
VITE_SUPABASE_URL=https://vnyebfjpkgqurgqxoqyv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueWViZmpwa2dxdXJncXhvcXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTU3MTMsImV4cCI6MjA4Mjg3MTcxM30.t1ubqDglst6Ie30asZsdKmqK24yciwNtETyUufEJhWo
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAecouinWdvBWMAQq255ALN7nFEL7N14_k
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for the build to complete (usually 1-2 minutes)
3. You'll get a URL like: `https://your-project.vercel.app`

### Step 5: Connect Your Custom Domain
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `your-domain.com`)
4. Follow the DNS configuration instructions:

**If using a domain registrar:**
- Add a CNAME record pointing to `cname.vercel-dns.com`
- Or add A records:
  - `76.76.19.19`
  - `76.76.19.61`

5. Wait for DNS propagation (5-30 minutes)
6. Your app will be live at `https://your-domain.com`

### Access Driver Login
Once deployed, the driver login will be available at:
- `https://your-domain.com/driver-login`

---

## Option 2: Deploy to Netlify

### Step 1: Sign up for Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub, GitLab, or Bitbucket

### Step 2: Deploy
1. Click "Add new site" → "Import an existing project"
2. Connect to your repository
3. Build settings will be auto-detected from `netlify.toml`

### Step 3: Add Environment Variables
In Netlify dashboard:
1. Go to "Site settings" → "Environment variables"
2. Add the same variables as listed above

### Step 4: Connect Domain
1. Go to "Domain settings"
2. Add your custom domain
3. Follow DNS instructions provided by Netlify

---

## Option 3: Manual Build & Deploy to Any Host

### Step 1: Build the App
```bash
npm install
npm run build
```

This creates a `dist` folder with your production files.

### Step 2: Upload to Your Host
- Upload the contents of the `dist` folder to your web hosting
- Make sure your server is configured to serve `index.html` for all routes (SPA routing)

### Step 3: Configure Your Server
For Apache, add to `.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

For Nginx:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Testing Your Deployment

Once deployed, test these URLs:
- Homepage: `https://your-domain.com/`
- Driver Login: `https://your-domain.com/driver-login`
- Regular Login: `https://your-domain.com/`

## Troubleshooting

### Domain shows parking page
- Your domain isn't properly connected yet
- Check DNS settings in your domain registrar
- Wait for DNS propagation (can take up to 48 hours, usually much faster)

### 404 errors on routes
- Make sure SPA routing is configured (see above)
- Check that `vercel.json` or `netlify.toml` is in your project

### Environment variables not working
- Make sure all `VITE_*` variables are set in your hosting platform
- Rebuild after adding variables
- Variables must start with `VITE_` to be accessible in the app

## Need Help?

1. Check your hosting platform's logs for error messages
2. Verify environment variables are set correctly
3. Make sure the build completes successfully
4. Test locally first: `npm run build && npm run preview`
