# Research Assistant Setup Guide

## Prerequisites
- Java 17 or higher
- Maven 3.6+
- Chrome/Edge browser
- Gemini AI API key

## Setup Steps

### 1. Get Gemini AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Configure Environment
1. Open `.env` file in the project root
2. Replace `your_gemini_api_key_here` with your actual API key:
   ```
   GEMINI_KEY=your_actual_api_key_here
   ```

### 3. Build and Run Backend
```bash
# Navigate to project directory
cd /Users/kenan/Desktop/projects/Research-Assistant/research-assistant

# Build the project
mvn clean install

# Run the backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 4. Install Browser Extension
1. Open Chrome/Edge browser
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the folder: `src/main/resources/static/research-assistant-ext/`
6. The extension should appear in your browser toolbar

### 5. Test the Extension
1. Go to any webpage
2. Select some text
3. Click the Research Assistant extension icon
4. Try the "Summarize" or "Paraphrase" buttons

## Troubleshooting

### Backend Issues
- **Port 8080 already in use**: Change port in `application.properties`
- **API key not working**: Check `.env` file and restart backend
- **CORS errors**: Backend has CORS configured for all origins

### Extension Issues
- **Extension not loading**: Check browser console for errors
- **API calls failing**: Verify backend is running on localhost:8080
- **No response**: Check if GEMINI_KEY is set correctly

## Project Structure
```
research-assistant/
├── src/main/resources/static/research-assistant-ext/  # Browser extension
├── src/main/java/com/research/assistant/              # Backend code
├── .env                                               # Environment variables
└── pom.xml                                           # Maven configuration
```

## Features
- **Text Summarization**: Summarize selected text using AI
- **Paraphrasing**: Rewrite text while maintaining meaning
- **Citation**: Generate APA citations for web content
- **Highlighting**: Highlight text on web pages and in notes
- **Notes**: Take notes with highlighting support