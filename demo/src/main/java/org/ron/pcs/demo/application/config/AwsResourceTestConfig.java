package org.ron.pcs.demo.application.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.ron.pcs.demo.application.properties.ProductionProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

@Profile(value = "test")
@Configuration
@RequiredArgsConstructor
public class AwsResourceTestConfig {
    private String dbCredentials;
    private static final String DB_URL = System.getenv("DB_URL");
    private String secretArn = System.getenv("SECRET_ARN");

    private final ObjectMapper objectMapper;

    @Bean
    public SecretsManagerClient secretsManagerClient() {
        return SecretsManagerClient.builder().region(Region.US_EAST_1).build();
    }

    @Bean
    public ProductionProperties prodDbCrednetials() throws JsonProcessingException {
        dbCredentials = secretsManagerClient()
                .getSecretValue(GetSecretValueRequest.builder().secretId(secretArn).build()).secretString();
                
        return ProductionProperties.builder()
                .dbUrl(DB_URL)
                .dbUsername(parseJson("username"))
                .dbPassword(parseJson("password"))
                .build();
    }

    private String parseJson(String key) throws JsonProcessingException {
        return objectMapper.readTree(dbCredentials).get(key).textValue();
    }
}