package com.research.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@Service
@Slf4j
public class ResearchService {
    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResearchService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }


    public String processContent(ResearchRequest request) {
        try {
            log.info("Processing request with operation: {}", request.getOperation());
            
            // Validate request
            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                throw new IllegalArgumentException("Content cannot be null or empty");
            }
            
            if (request.getOperation() == null || request.getOperation().trim().isEmpty()) {
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
                    "contents", new Object[] {
                            Map.of("parts", new Object[]{
                                    Map.of("text", prompt)
                            })
                    }
            );

            log.info("Making request to Gemini API: {}", geminiApiUrl + "***");
            
            String response = webClient.post()
                    .uri(geminiApiUrl + geminiApiKey)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("Received response from Gemini API");
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
                if (firstCandidate.getContent() != null &&
                        firstCandidate.getContent().getParts() != null &&
                        !firstCandidate.getContent().getParts().isEmpty()) {
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
            default:
                throw new IllegalArgumentException("Unknown Operation: " + request.getOperation());
        }
        prompt.append(request.getContent());
        return prompt.toString();
    }
}