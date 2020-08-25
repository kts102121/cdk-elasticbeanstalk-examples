package org.ron.pcs.demo.application.config;

import javax.sql.DataSource;

import org.ron.pcs.demo.application.properties.ProductionProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import lombok.AllArgsConstructor;

@Profile(value = {"prod","test"})
@Configuration
@AllArgsConstructor
public class DatasourceConfig {
    private final ProductionProperties dbCredentials;

    @Bean
    public DataSource getDataSource() {
        return DataSourceBuilder.create()
                .url("jdbc:mysql://" + dbCredentials.getDbUrl() + ":3306/test?characterEncoding=UTF-8&autoReconnect=true&serverTimezone=UTC")
                .username(dbCredentials.getDbUsername())
                .password(dbCredentials.getDbPassword())
                .build();
    }
    
}