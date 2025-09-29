# Research Assistant

A Chrome extension designed to help researchers, students, and professionals efficiently process and organize information from web pages. Perfect for anyone spending significant time browsing articles, research papers, and online content.

## Why I Built This

As someone who spends considerable time reading research papers and articles online, I found myself constantly switching between multiple tools to:
- Summarize lengthy content
- Paraphrase complex ideas
- Generate proper citations
- Take organized notes
- Highlight important sections

This extension consolidates all these functions into one seamless workflow, saving time and improving research efficiency.

## Core Features

- **AI Summarization**: Instantly summarize selected text using Google's Gemini AI
- **Smart Paraphrasing**: Rewrite content while maintaining original meaning
- **APA Citation Generation**: Create properly formatted academic citations
- **Advanced Note-Taking**: Organize notes in folders with real-time auto-saving
- **Text Highlighting**: Highlight web content and notes with multiple colors
- **Persistent Storage**: Notes saved locally, never lost when switching folders

## Technology Stack

### Frontend (Chrome Extension)
- **JavaScript ES6+**: Modern JavaScript with async/await patterns
- **Chrome Extension API**: Native browser integration with Manifest V3
- **CSS3**: Responsive design with modern UI/UX principles
- **HTML5**: Semantic markup with accessibility features

### Backend (Spring Boot)
- **Java 17**: Modern Java with Spring Boot framework
- **Google Gemini AI**: Advanced AI integration for text processing
- **RESTful API**: Clean API design with proper HTTP status codes
- **Docker**: Containerized deployment for cloud platforms

### DevOps & Deployment
- **GitHub**: Version control and code repository
- **Render**: Free cloud hosting platform for backend
- **Docker**: Containerization for consistent deployment

## Setup Instructions

### Prerequisites
- Chrome browser
- Java 17+ (for local development)
- Gemini API key (free from Google AI Studio)

### 1. Clone Repository
```bash
git clone https://github.com/KananIbadzade/Research-Assistant.git
cd Research-Assistant
```

### 2. Get Gemini API Key
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a new API key (free)
- Copy the key for backend configuration

### 3. Start Backend (Local Development)
```bash
cd research-assistant
export GEMINI_KEY=your_gemini_api_key
./mvnw spring-boot:run
```

### 4. Load Extension in Chrome
- Open `chrome://extensions/`
- Enable "Developer mode" (top-right toggle)
- Click "Load unpacked"
- Select the `research-assistant-ext` folder
- Pin the extension for easy access

### 5. Test Features
- Open any webpage (Wikipedia, research papers, news articles)
- Select text and test summarization, paraphrasing, and citation generation
- Create note folders and test the note-taking functionality
- Switch between folders to verify real-time saving works

## Usage Examples

### Academic Research
1. Open a research paper or article
2. Select key paragraphs
3. Generate summaries and paraphrases
4. Create APA citations
5. Organize notes in project folders

### Content Creation
1. Research topics on multiple websites
2. Collect and summarize information
3. Paraphrase content for original writing
4. Generate citations for sources
5. Organize research in themed folders

### Professional Use
1. Research competitors or market trends
2. Summarize lengthy reports
3. Create clean, cited summaries
4. Organize findings by project/client

## Configuration

### Extension Config
Edit `research-assistant-ext/config.js`:
- **Local development**: `http://localhost:8080` (default)
- **Production**: Update with your deployed backend URL

### Backend Configuration
- Set `GEMINI_KEY` environment variable with your Google AI Studio API key
- Backend runs on port 8080 by default

## Troubleshooting

- **Extension won't load**: Check Chrome developer mode is enabled
- **API errors**: Verify backend is running and GEMINI_KEY is set correctly
- **No response**: Check Gemini API key is valid and backend is accessible
- **Notes not saving**: Ensure you're not in incognito mode (local storage disabled)

## Deployment

### Quick Deploy to Render (Free Cloud Hosting)

1. **Get Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a free API key
   - Copy the key

2. **Deploy Backend to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Sign up/login with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     ```
     Name: research-assistant-backend
     Environment: Docker
     Region: Oregon (US West)
     Branch: main
     ```
   - Set Environment Variable: `GEMINI_KEY=your_actual_api_key`
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your service URL: `https://research-assistant-backend.onrender.com`

3. **Extension is Already Configured**:
   - Extension automatically uses the deployed backend
   - No additional configuration needed

4. **Test Deployment**:
   - Load extension in Chrome
   - Test summarization and paraphrasing features
   - Verify everything works with the deployed backend

### Manual Extension Installation

1. **Load Extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension-folder` directory

2. **Package for Distribution** (Optional):
   ```bash
   cd extension-folder
   zip -r research-assistant-extension.zip .
   ```

## Repository

**GitHub**: https://github.com/KananIbadzade/Research-Assistant

---

**Ready to streamline your research workflow?** Clone the repository and start using the extension today! 🚀