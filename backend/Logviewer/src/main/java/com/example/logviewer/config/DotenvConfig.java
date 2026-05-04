package com.example.logviewer.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;

@Configuration
public class DotenvConfig {

    @PostConstruct
    public void loadEnv() {

        Dotenv dotenv = Dotenv.configure()
                .directory("./")   // IMPORTANT for Eclipse
                .ignoreIfMissing()
                .load();

        dotenv.entries().forEach(entry -> {
            System.setProperty(entry.getKey(), entry.getValue());
            System.out.println("Loaded ENV: " + entry.getKey() + "=" + entry.getValue());
        });
    }
}