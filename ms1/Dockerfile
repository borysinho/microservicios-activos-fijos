# ── Base con Gradle Wrapper ────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS gradle-base

WORKDIR /workspace

COPY gradlew settings.gradle build.gradle gradle.properties ./
COPY gradle/ gradle/
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon -q >/dev/null

# ── Desarrollo: ejecuta Spring Boot con el codigo montado ──────────────
FROM gradle-base AS dev

COPY src/ src/

EXPOSE 8080

ENTRYPOINT ["./gradlew", "-Dorg.gradle.java.home=/opt/java/openjdk", "bootRun", "--no-daemon"]

# ── Build de produccion ────────────────────────────────────────────────
FROM gradle-base AS builder

COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# ── Runtime de produccion ──────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

COPY --from=builder /workspace/build/libs/*.jar app.jar

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
