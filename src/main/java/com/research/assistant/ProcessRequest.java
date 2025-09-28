package com.research.assistant;

import com.fasterxml.jackson.annotation.JsonAlias;

public record ProcessRequest(
    @JsonAlias({"operation", "action", "mode", "type"}) String operation,
    @JsonAlias({"content", "text", "prompt"}) String content
) {}