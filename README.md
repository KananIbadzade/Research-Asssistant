# 📚 Research Assistant

> A Chrome extension that helps you summarize, take notes, and organize your research - all in one place!

## 🎯 Quick Demo

[Add your demo video/gif here]

## 💡 Why I Built This

As someone who spends hours researching online - reading articles, papers, and tons of content - I got tired of jumping between different tools to summarize stuff, take notes, and organize everything. So I built this extension to do it all in one spot. Simple as that! 

It's been super helpful for my own research workflow, and I thought others might find it useful too. 😊

## ✨ What It Does

- **Summarize** any text you select with AI
- **Take notes** in an organized side panel
- **Paraphrase** content to understand it better
- **Generate citations** (APA format)
- **Organize** your notes in folders

## 🛠️ Tech Stack

**Frontend:**
- JavaScript (Chrome Extension)
- HTML/CSS

**Backend:**
- Java 17 + Spring Boot
- Google Gemini AI API

**Hosting:**
- Backend hosted on [Render](https://render.com) (free tier)

## 🚀 Quick Start (Just Use It!)

1. Download the `extension-folder` from this repo
2. Open Chrome and go to `chrome://extensions/`
3. Turn on "Developer mode" (top right)
4. Click "Load unpacked" and select the `extension-folder`
5. That's it! Start using it on any webpage 🎉

**⏳ First-time note:** The backend is on Render's free plan, so it sleeps after 15 minutes of inactivity. The first request might take 30-60 seconds to wake up - just be patient! After that, it's fast. ☕

## 🔧 Running It Locally (For Developers)

Want to customize it or run your own backend? Here's how:

### 1. Clone the repo
```bash
git clone https://github.com/KananIbadzade/Research-Assistant.git
cd Research-Assistant/research-assistant
```

### 2. Get a Gemini API Key
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Sign in and create a free API key
- Copy it

### 3. Run the backend
```bash
export GEMINI_KEY=your_api_key_here
./mvnw spring-boot:run
```

The backend runs on `http://localhost:8080`

### 4. Update extension config
Edit `extension-folder/config.js` to point to your local backend:
```javascript
const API_BASE_URL = 'http://localhost:8080';
```

### 5. Load the extension
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension-folder`

## ☁️ Deploy Your Own (Render Cloud)

Want to host your own version? Super easy:

1. **Get Gemini API Key** (see above)

2. **Deploy to Render:**
   - Sign up at [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect this GitHub repo
   - Set environment: **Docker**
   - Add environment variable: `GEMINI_KEY=your_api_key`
   - Click "Create Web Service"
   - Wait 5-10 mins for deployment

3. **Update extension config:**
   - Edit `extension-folder/config.js`
   - Change API URL to your Render URL: `https://your-app.onrender.com`

4. **Reload extension in Chrome and you're done!**

## 🤝 Contributing

Feel free to fork, improve, and make it better! Found a bug or have an idea? Open an issue or submit a PR. All contributions welcome! 

## 📝 License

MIT - do whatever you want with it!

---

Built with ☕ and late-night coding sessions.

If this helps your research workflow, give it a ⭐!