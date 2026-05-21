package com.example.logviewer.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class LogQueryBuilder {

    public void appendBaseFilters(
            StringBuilder whereClause,
            MapSqlParameterSource params,
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            String alias
    ) {
        String prefix = alias + ".";

        if (StringUtils.hasText(applicationCode)) {
            whereClause.append(" AND ")
                    .append(prefix).append("APPLICATION_CODE = :applicationCode");
            params.addValue("applicationCode", applicationCode);
        }

        if (interfaceCodes != null && !interfaceCodes.isEmpty()) {
            whereClause.append(" AND TRIM(")
                    .append(prefix).append("INTERFACE_CODE) IN (:interfaceCodes)");
            params.addValue("interfaceCodes", interfaceCodes);
        }

        if (fromDateTime != null) {
            whereClause.append(" AND ")
                    .append(prefix).append("LOGTIME >= :fromDateTime");
            params.addValue("fromDateTime", fromDateTime);
        }

        if (toDateTime != null) {
            whereClause.append(" AND ")
                    .append(prefix).append("LOGTIME <= :toDateTime");
            params.addValue("toDateTime", toDateTime);
        }
    }


    public void appendCaseFilter(
            StringBuilder whereClause,
            String caseType,
            String alias,
            String errorTable
    ) {
        if (!StringUtils.hasText(caseType)) {
            return;
        }

        String normalized = caseType.trim().toLowerCase();
        String prefix = alias + ".TRANSACTION_ID";

        if ("success".equals(normalized)) {
            whereClause.append(" AND ")
                    .append(prefix).append(" IS NOT NULL")
                    .append(" AND NOT EXISTS (")
                    .append(" SELECT 1 FROM ").append(errorTable).append(" e ")
                    .append(" WHERE TRIM(e.TRANSACTION_ID) = TRIM(")
                    .append(prefix).append(")")
                    .append(" )");

        } else if ("failure".equals(normalized)) {
            whereClause.append(" AND ")
                    .append(prefix).append(" IS NOT NULL")
                    .append(" AND EXISTS (")
                    .append(" SELECT 1 FROM ").append(errorTable).append(" e ")
                    .append(" WHERE TRIM(e.TRANSACTION_ID) = TRIM(")
                    .append(prefix).append(")")
                    .append(" )");
        }
    }


    public String buildLoggedMessageWhereClause(
            String auditTable,
            List<String> interfaceCodes,
            String caseType,
            String errorTable
    ) {
        StringBuilder whereClause = new StringBuilder(
                "FROM " + auditTable + " l " +
                "WHERE l.APPLICATION_CODE = :applicationCode " +
                "AND l.LOGTIME >= :fromDateTime " +
                "AND l.LOGTIME <= :toDateTime " +
                "AND DBMS_LOB.INSTR(l.LOGGED_MESSAGE, :searchValue) > 0"
        );

        if (interfaceCodes != null && !interfaceCodes.isEmpty()) {
            whereClause.append(" AND TRIM(l.INTERFACE_CODE) IN (:interfaceCodes)");
        }

        appendCaseFilter(whereClause, caseType, "l", errorTable);

        return whereClause.toString();
    }

   
    public MapSqlParameterSource buildLoggedMessageParams(
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {
        MapSqlParameterSource params = new MapSqlParameterSource();

        params.addValue("applicationCode", applicationCode);
        params.addValue("fromDateTime", fromDateTime);
        params.addValue("toDateTime", toDateTime);
        params.addValue("searchValue", searchValue);

        if (interfaceCodes != null && !interfaceCodes.isEmpty()) {
            params.addValue("interfaceCodes", interfaceCodes);
        }

        return params;
    }
}