package com.socialflow.ai.exception;

/**
 * Exception thrown when AI Service API call fails
 */
public class AiServiceException extends RuntimeException {
    
    private String provider;
    private String model;
    private String endpoint;
    private Integer httpStatus;
    
    public AiServiceException(String message) {
        super(message);
    }
    
    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public AiServiceException(String message, String provider, String model, String endpoint) {
        super(message);
        this.provider = provider;
        this.model = model;
        this.endpoint = endpoint;
    }
    
    public AiServiceException(String message, String provider, String model, String endpoint, Integer httpStatus) {
        super(message);
        this.provider = provider;
        this.model = model;
        this.endpoint = endpoint;
        this.httpStatus = httpStatus;
    }
    
    public String getProvider() {
        return provider;
    }
    
    public String getModel() {
        return model;
    }
    
    public String getEndpoint() {
        return endpoint;
    }
    
    public Integer getHttpStatus() {
        return httpStatus;
    }
    
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("AiServiceException: ").append(getMessage());
        if (endpoint != null) {
            sb.append(" [").append(endpoint).append("]");
        }
        if (provider != null) {
            sb.append(" Provider: ").append(provider);
        }
        if (model != null) {
            sb.append(" Model: ").append(model);
        }
        if (httpStatus != null) {
            sb.append(" Status: ").append(httpStatus);
        }
        return sb.toString();
    }
}
