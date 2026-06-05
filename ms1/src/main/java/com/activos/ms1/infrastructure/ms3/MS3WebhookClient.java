package com.activos.ms1.infrastructure.ms3;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class MS3WebhookClient {

    private final RestClient restClient;

    @Value("${ms3.webhook.url:http://localhost:3000/webhook/activos}")
    private String webhookUrl;

    public void notificarEvento(String tipoEvento, UUID activoId, String codigoActivo) {
        try {
            var payload = Map.of(
                    "tipoEvento", tipoEvento,
                    "activoId", activoId.toString(),
                    "codigoActivo", codigoActivo,
                    "timestamp", java.time.LocalDateTime.now().toString()
            );

            restClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Webhook MS3 notificado: evento={}, activo={}", tipoEvento, codigoActivo);

        } catch (Exception e) {
            log.warn("No se pudo notificar al MS3 (evento={}, activo={}): {}",
                    tipoEvento, codigoActivo, e.getMessage());
        }
    }
}
