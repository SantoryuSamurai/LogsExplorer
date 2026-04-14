package com.example.logviewer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Configuration
public class AsyncConfig {

    @Bean(name = "logQueryExecutor")
    public Executor logQueryExecutor() {
        return Executors.newFixedThreadPool(4);
    }
}