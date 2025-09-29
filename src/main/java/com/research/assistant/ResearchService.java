package com.research.assistant;

import java.time.Duration;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ResearchService {

    private final String geminiApiUrl;
    private final String geminiApiKey;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResearchService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        
        // Use environment variables directly - no configuration files needed
        this.geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";
        this.geminiApiKey = System.getenv("GEMINI_KEY");
        
        log.info("ResearchService initialized with environment-based configuration");
        log.info("API URL configured: {}", geminiApiUrl);
        log.info("API Key configured: {}", geminiApiKey != null && !geminiApiKey.trim().isEmpty());
        log.info("Environment variables:");
        log.info("GEMINI_KEY: {}", System.getenv("GEMINI_KEY") != null ? "SET" : "NOT SET");
    }

    public String processContent(ResearchRequest request) {
        try {
            log.info("Processing request with operation: {}", request.getOperation());
            log.info("API Key configured: {}", geminiApiKey != null && !geminiApiKey.trim().isEmpty());
            log.info("API URL: {}", geminiApiUrl);

            // Validate request
            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                log.error("Content is null or empty");
                throw new IllegalArgumentException("Content cannot be null or empty");
            }

            if (request.getOperation() == null || request.getOperation().trim().isEmpty()) {
                log.error("Operation is null or empty");
                throw new IllegalArgumentException("Operation cannot be null or empty");
            }

            // Check if API key is configured
            if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
                log.error("Gemini API key is not configured. Please set GEMINI_KEY environment variable.");
                return "Error: API key not configured. Please set GEMINI_KEY environment variable.";
            }

            // Build the prompt
            String prompt = buildPrompt(request);
            log.debug("Built prompt: {}", prompt);

            // Query the AI Model API
            Map<String, Object> requestBody = Map.of(
                    "contents", new Object[]{
                        Map.of("parts", new Object[]{
                    Map.of("text", prompt)
                })
                    }
            );

            log.info("Making request to Gemini API: {}", geminiApiUrl + "***");
            log.info("Request body: {}", requestBody);

            String response = webClient.post()
                    .uri(geminiApiUrl + geminiApiKey)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(25))
                    .block();

            log.info("Received response from Gemini API: {}", response);
            return extractTextFromResponse(response);

        } catch (WebClientResponseException e) {
            log.error("WebClient error: Status={}, Response={}", e.getStatusCode(), e.getResponseBodyAsString());
            return "Error calling Gemini API: " + e.getStatusCode() + " - " + e.getResponseBodyAsString();
        } catch (IllegalArgumentException e) {
            log.error("Invalid request: {}", e.getMessage());
            return "Error: " + e.getMessage();
        } catch (Exception e) {
            log.error("Unexpected error processing request", e);
            return "Error: " + e.getMessage();
        }
    }

    private String extractTextFromResponse(String response) {
        try {
            GeminiResponse geminiResponse = objectMapper.readValue(response, GeminiResponse.class);
            if (geminiResponse.getCandidates() != null && !geminiResponse.getCandidates().isEmpty()) {
                GeminiResponse.Candidate firstCandidate = geminiResponse.getCandidates().get(0);
                if (firstCandidate.getContent() != null
                        && firstCandidate.getContent().getParts() != null
                        && !firstCandidate.getContent().getParts().isEmpty()) {
                    return firstCandidate.getContent().getParts().get(0).getText();
                }
            }
            return "No content found in response";
        } catch (Exception e) {
            return "Error Parsing: " + e.getMessage();
        }
    }

    private String buildPrompt(ResearchRequest request) {
        StringBuilder prompt = new StringBuilder();
        switch (request.getOperation()) {
            case "summarize":
                prompt.append("Provide a clear and concise summary of the following text in a few sentences:\n\n");
                break;
            case "suggest":
                prompt.append("Based on the following content: suggest related topics and further reading. Format the response with clear headings and bullet points:\n\n");
                break;
            case "paraphrase":
                prompt.append("Rewrite the following text using different words while keeping the exact same meaning. Return only the paraphrased text without any additional explanations or commentary:\n\n");
                break;
            default:
                throw new IllegalArgumentException("Unknown Operation: " + request.getOperation());
        }
        prompt.append(request.getContent());
        return prompt.toString();
    }

}
