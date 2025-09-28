# Multi-stage build for efficient production image
FROM maven:3.9.5-eclipse-temurin-17 AS build

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml first (for better caching)
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Make mvnw executable and set proper permissions
RUN chmod +x ./mvnw

# Copy source code
COPY src ./src

# Build the application with retry and verbose output
RUN ./mvnw clean package -DskipTests -X || \
    (echo "First build failed, retrying..." && ./mvnw clean package -DskipTests)

# Production stage
FROM eclipse-temurin:17-jre-jammy

# Set working directory
WORKDIR /app

# Copy the built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port (Render will set PORT environment variable)
EXPOSE 8080

# Health check for Render
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application with proper JVM settings for Render
ENTRYPOINT ["java", "-Xmx512m", "-Xms256m", "-jar", "app.jar"]