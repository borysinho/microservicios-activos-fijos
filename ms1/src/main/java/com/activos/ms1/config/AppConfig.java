package com.activos.ms1.config;

import graphql.scalars.ExtendedScalars;
import graphql.language.StringValue;
import graphql.language.Value;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Configuration
public class AppConfig {

    @Bean
    public RestClient restClient() {
        return RestClient.create();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public RuntimeWiringConfigurer runtimeWiringConfigurer() {
        return wiringBuilder -> wiringBuilder
                .scalar(ExtendedScalars.Date)
                .scalar(localDateTimeScalar())
                .scalar(ExtendedScalars.GraphQLBigDecimal)
                .scalar(ExtendedScalars.UUID);
    }

    private GraphQLScalarType localDateTimeScalar() {
        Coercing<LocalDateTime, String> coercing = new Coercing<>() {
            @Override
            public String serialize(Object input) throws CoercingSerializeException {
                if (input instanceof LocalDateTime value) {
                    return value.atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                }
                if (input instanceof OffsetDateTime value) {
                    return value.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                }
                if (input instanceof String value) {
                    return value;
                }
                throw new CoercingSerializeException("DateTime debe ser LocalDateTime, OffsetDateTime o String.");
            }

            @Override
            public LocalDateTime parseValue(Object input) throws CoercingParseValueException {
                if (input instanceof LocalDateTime value) {
                    return value;
                }
                if (input instanceof OffsetDateTime value) {
                    return value.toLocalDateTime();
                }
                if (input instanceof String value) {
                    return parseDateTime(value);
                }
                throw new CoercingParseValueException("DateTime debe recibirse como String.");
            }

            @Override
            public LocalDateTime parseLiteral(Object input) throws CoercingParseLiteralException {
                if (input instanceof StringValue value) {
                    return parseDateTime(value.getValue());
                }
                throw new CoercingParseLiteralException("DateTime debe recibirse como StringValue.");
            }

            @Override
            public Value<?> valueToLiteral(Object input) {
                return StringValue.newStringValue(serialize(input)).build();
            }

            private LocalDateTime parseDateTime(String value) {
                try {
                    return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toLocalDateTime();
                } catch (Exception ignored) {
                    return LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                }
            }
        };

        return GraphQLScalarType.newScalar()
                .name("DateTime")
                .description("DateTime compatible con java.time.LocalDateTime.")
                .coercing(coercing)
                .build();
    }
}
