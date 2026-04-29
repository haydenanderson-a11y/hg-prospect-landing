# HG Insights Prospect Intelligence Landing Page

A self-serve landing page where prospects can enter their company domain and instantly see personalized GTM intelligence powered by HG Insights / Phoenix MCP.

## 🎯 What It Does

1. Prospect enters their company domain (e.g., `asana.com`)
2. Backend queries Phoenix MCP for:
   - Company firmographics (name, industry, size, location)
   - Technology stack (with GTM-relevant products highlighted)
   - Buyer intent signals (topics they're researching)
   - Competitive landscape (competitors in their space)
   - Opportunity teasers (accounts using competitors + showing displacement intent)
3. Results are rendered in a beautiful, branded page
4. CTA drives prospects to request a full demo

## 🚀 Quick Deploy to Netlify

### Option 1: One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_REPO_HERE)

### Option 2: Manual Deploy

1. **Push to GitHub** (or connect your repo)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/hg-prospect-landing.git
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repo
   - Deploy settings should auto-detect from `netlify.toml`

3. **Configure Environment Variables** (see below)

### Option 3: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and deploy
netlify login
netlify deploy --prod
```

## ⚙️ Environment Variables

Set these in Netlify Dashboard → Site Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `PHOENIX_API_URL` | Yes | Phoenix MCP API base URL (e.g., `https://api.hginsights.com/mcp`) |
| `PHOENIX_API_KEY` | Yes | API key for Phoenix MCP authentication |

**Note:** Without the API key, the app will return demo data (useful for testing the UI).

## 📁 Project Structure

```
hg-prospect-landing/
├── public/
│   └── index.html          # Main landing page + results UI
├── netlify/
│   └── functions/
│       └── company-intel.js # Serverless API function
├── netlify.toml             # Netlify configuration
└── README.md
```

## 🔌 API Integration

The Netlify Function (`company-intel.js`) makes these Phoenix MCP calls:

1. **`company_firmographic`** - Company overview (name, industry, employees, HQ)
2. **`company_technographic`** - Technology stack
3. **`company_intent`** - Buyer intent signals
4. **`intent_category`** (future) - For finding displacement opportunities

### Customizing API Calls

Edit `netlify/functions/company-intel.js` to:
- Add more data sources
- Customize the competitor inference logic
- Add caching for performance
- Implement rate limiting

## 🎨 Customization

### Branding
Edit the CSS variables in `public/index.html`:

```css
:root {
  --hg-navy: #0B1B3D;
  --hg-blue: #1B4FE4;
  --hg-cyan: #00C9DB;
  /* ... */
}
```

### Content
- Update the hero text, feature descriptions, and CTAs
- Change the CTA link (`https://hginsights.com/demo`)
- Modify trust logos section

### Data Display
- Adjust how many tech stack items to show (currently 12)
- Customize competitor inference rules
- Change the blurred teaser content

## 🧪 Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run locally with functions
netlify dev

# Open http://localhost:8888
```

## 📊 Analytics (Optional)

Add tracking by inserting before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔒 Security Notes

- API keys are stored as environment variables (never in code)
- Serverless functions run server-side (keys not exposed to browser)
- Consider adding rate limiting for production use
- The Netlify Function validates input before making API calls

## 🐛 Troubleshooting

**"Failed to fetch company data"**
- Check that environment variables are set correctly
- Verify Phoenix API URL and key are valid
- Check Netlify Function logs for errors

**Demo data showing instead of real data**
- API key not configured → set `PHOENIX_API_KEY` in Netlify

**No intent signals showing**
- Some companies may not have intent data
- Check that `company_intent` API is returning data

## 📝 Future Enhancements

- [ ] Add company logo via Clearbit API
- [ ] Implement caching layer (Redis/Netlify Edge)
- [ ] Add email capture before showing full results
- [ ] Generate PDF report option
- [ ] A/B test different CTA variations
- [ ] Add more competitor intelligence data

## 📄 License

Internal HG Insights use. Not for redistribution.
