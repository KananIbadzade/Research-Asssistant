# Deployment Checklist

## Pre-Deployment ✅

- [x] Extension config updated to use production URL
- [x] Manifest permissions updated for production
- [x] Dockerfile created for Render deployment
- [x] .env.example created for reference
- [x] README updated with deployment instructions
- [x] Backend configuration verified as production-ready

## Deployment Steps

### 1. Get Gemini API Key
- [ ] Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- [ ] Create a new API key (free)
- [ ] Copy the API key

### 2. Deploy to Render
- [ ] Go to [Render Dashboard](https://dashboard.render.com)
- [ ] Sign up/login with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository: `Research-Assistant`
- [ ] Configure service:
  ```
  Name: research-assistant-backend
  Environment: Docker
  Region: Oregon (US West)
  Branch: main
  Root Directory: (leave empty)
  ```
- [ ] Set Environment Variable: `GEMINI_KEY=your_actual_api_key`
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 minutes)
- [ ] Note the service URL: `https://research-assistant-backend.onrender.com`

### 3. Test Deployment
- [ ] Test health endpoint: `https://research-assistant-backend.onrender.com/api/research/health`
- [ ] Load extension in Chrome
- [ ] Test summarization feature
- [ ] Test paraphrasing feature
- [ ] Test citation generation
- [ ] Test note-taking and highlighting

### 4. Share Extension
- [ ] Package extension for distribution:
  ```bash
  cd extension-folder
  zip -r research-assistant-extension.zip .
  ```
- [ ] Share with users for installation

## Post-Deployment Monitoring

- [ ] Monitor Render dashboard for logs
- [ ] Check API usage and performance
- [ ] Watch for any errors or issues
- [ ] Verify extension works for other users

## Troubleshooting

### Common Issues:
- **Build fails**: Check Java version compatibility
- **API key not working**: Verify environment variable is set correctly
- **Extension won't load**: Check Chrome developer mode is enabled
- **API calls fail**: Verify backend URL is accessible
- **CORS errors**: Backend has CORS configured for all origins

### Support:
- Check Render logs for backend issues
- Check Chrome extension console for frontend issues
- Verify Gemini API key is valid and has quota remaining