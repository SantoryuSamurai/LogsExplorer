package com.example.logviewer.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DbConfig {

    @Value("${app.db.schema}")
    private String schema;

    @Value("${app.db.table.audit-log}")
    private String auditLog;

    @Value("${app.db.table.success-log}")
    private String successLog;

    @Value("${app.db.table.error-log}")
    private String errorLog;

    @Value("${app.db.table.config-log}")
    private String configLog;

    public String auditLogTable() {
        return schema + "." + auditLog;
    }

    public String successLogTable() {
        return schema + "." + successLog;
    }

    public String errorLogTable() {
        return schema + "." + errorLog;
    }

    public String configLogTable() {
        return schema + "." + configLog;
    }
}