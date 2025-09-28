# Railway Deployment Guide (Easiest Option)

## Why Railway?
- **Dead simple**: Connect GitHub repo → Auto-deploy
- **Free tier**: $5 credit monthly (usually sufficient)
- **Modern**: Built for developers, by developers
- **Skills showcased**: Modern DevOps, GitOps, Docker

## Step 1: Prepare Your Application

### 1. Update application.properties for production
```properties
spring.application.name=research-assistant
gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=
gemini.api.key=${GEMINI_KEY}
server.port=${PORT:8080}
```

### 2. Create railway.json (optional)
```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "java -jar app.jar",
    "healthcheckPath": "/actuator/health"
  }
}
```

## Step 2: Railway Setup

### 1. Sign up at Railway.app
- Connect your GitHub account
- Import your repository

### 2. Configure Environment Variables
In Railway dashboard:
- `GEMINI_KEY`: Your Gemini API key
- `PORT`: 8080 (auto-set by Railway)

### 3. Deploy
- Railway automatically detects Dockerfile
- Builds and deploys your app
- Provides HTTPS URL automatically

## Step 3: Update Chrome Extension

### Update manifest.json
```json
{
  "manifest_version": 3,
  "name": "Research Assistant",
  "version": "1.0",
  "description": "AI-powered Research Assistant",
  "icons": {
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": [
    "activeTab",
    "storage",
    "sidePanel",
    "scripting"
  ],
  "action": {
    "default_title": "Research Assistant",
    "default_icon": {
      "32": "icons/icon32.png"
    }
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "https://your-app-name.up.railway.app/*"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## Step 4: Custom Domain (Optional)

### Add Custom Domain
1. In Railway dashboard → Settings → Domains
2. Add your domain
3. Update DNS records
4. Railway handles SSL automatically

## Step 5: Monitoring

### Built-in Features
- Automatic deployments on git push
- Logs in real-time
- Health checks
- Metrics dashboard

## Advantages of Railway
✅ **Zero configuration** - Just push code
✅ **Automatic HTTPS** - SSL certificates included
✅ **GitOps** - Deploy on every push
✅ **Modern UI** - Clean, developer-friendly
✅ **Free tier** - $5 credit monthly
✅ **Custom domains** - Professional URLs
✅ **Monitoring** - Built-in metrics and logs

## Skills Demonstrated
✅ Modern DevOps practices
✅ GitOps workflow
✅ Docker containerization
✅ Environment management
✅ Domain configuration
✅ SSL/TLS automation
✅ CI/CD integration
✅ Monitoring and observability