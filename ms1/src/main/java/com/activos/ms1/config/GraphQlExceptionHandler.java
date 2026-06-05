package com.activos.ms1.config;

import java.util.NoSuchElementException;

import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.stereotype.Component;

import graphql.ErrorType;
import graphql.GraphQLError;
import graphql.schema.DataFetchingEnvironment;

/**
 * Mapea excepciones de negocio a errores GraphQL con clasificación apropiada.
 * Sin este handler, IllegalArgumentException e IllegalStateException se
 * presentan como INTERNAL_ERROR en el cliente.
 */
@Component
public class GraphQlExceptionHandler extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        if (ex instanceof IllegalArgumentException || ex instanceof IllegalStateException) {
            return GraphQLError.newError()
                    .errorType(ErrorType.ValidationError)
                    .message(ex.getMessage())
                    .path(env.getExecutionStepInfo().getPath())
                    .location(env.getField().getSourceLocation())
                    .build();
        }
        if (ex instanceof NoSuchElementException) {
            return GraphQLError.newError()
                    .errorType(ErrorType.DataFetchingException)
                    .message(ex.getMessage())
                    .path(env.getExecutionStepInfo().getPath())
                    .location(env.getField().getSourceLocation())
                    .build();
        }
        return null; // otros errores → comportamiento por defecto
    }
}
