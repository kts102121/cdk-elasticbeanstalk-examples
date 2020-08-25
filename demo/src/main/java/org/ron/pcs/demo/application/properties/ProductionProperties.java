package org.ron.pcs.demo.application.properties;

import org.springframework.lang.Nullable;

import lombok.Builder;
import lombok.Getter;

@Getter
public class ProductionProperties {
    private String dbUrl;
    private String dbUsername;
    private String dbPassword;
    private String cacheUrl;

    @Builder
    public ProductionProperties(String dbUrl, String dbUsername, String dbPassword, @Nullable String cacheUrl) {
        this.dbUrl = dbUrl;
        this.dbUsername = dbUsername;
        this.dbPassword = dbPassword;
        this.cacheUrl = cacheUrl;
    }
}