package com.research.assistant;

import lombok.AllArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/research")
@AllArgsConstructor
public class ResearchController {
    private final ResearchService researchService;

    @GetMapping("/health")
    public String health() { 
        return "ok"; 
    }

    @PostMapping(value = "/process", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> process(@RequestBody ProcessRequest req) {
        String op = Optional.ofNullable(req.operation()).orElse("").trim();
        String text = Optional.ofNullable(req.content()).orElse("").trim();

        if (op.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Operation cannot be null or empty"));
        }
        if (text.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Content cannot be null or empty"));
        }

        try {
            // Convert to ResearchRequest for existing service
            ResearchRequest request = new ResearchRequest();
            request.setContent(text);
            request.setOperation(op);
            
            String result = researchService.processContent(request);
            
            // For paraphrase operation, return plain text
            if ("paraphrase".equals(op)) {
                return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(result);
            }
            
            // For other operations, return JSON
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("operation", op, "result", result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Processing failed: " + e.getMessage()));
        }
    }
}
