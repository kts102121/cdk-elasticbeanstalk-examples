package org.ron.pcs.demo.application.properties;

import lombok.Builder;
import lombok.Getter;

@Getter
public class ProductionProperties {
    private String dbUrl;
    private String dbUsername;
    private String dbPassword;

    @Builder
    public ProductionProperties(String dbUrl, String dbUsername, String dbPassword) {
        this.dbUrl = dbUrl;
        this.dbUsername = dbUsername;
        this.dbPassword = dbPassword;
    }
}