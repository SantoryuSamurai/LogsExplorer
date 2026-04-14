package com.example.logviewer.repository;

import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.PagedResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Repository
public class LogRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public LogRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<String> getAllApplicationCodes() {
        String sql = """
                SELECT DISTINCT APPLICATION_CODE
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG
                WHERE APPLICATION_CODE IS NOT NULL
                ORDER BY APPLICATION_CODE
                """;
        return jdbcTemplate.queryForList(sql, new MapSqlParameterSource(), String.class);
    }

    public List<String> getInterfaceCodesByApplication(String applicationCode) {
        String sql = """
                SELECT DISTINCT INTERFACE_CODE
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG
                WHERE APPLICATION_CODE = :applicationCode
                  AND INTERFACE_CODE IS NOT NULL
                ORDER BY INTERFACE_CODE
                """;

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("applicationCode", applicationCode);

        return jdbcTemplate.queryForList(sql, params, String.class);
    }

    public List<String> getAllInterfaceCodes() {
        String sql = """
                SELECT DISTINCT INTERFACE_CODE
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG
                WHERE INTERFACE_CODE IS NOT NULL
                ORDER BY INTERFACE_CODE
                """;
        return jdbcTemplate.queryForList(sql, new MapSqlParameterSource(), String.class);
    }

    public PagedResponse<LogRecord> searchLogs(
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG
                WHERE 1=1
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();

        if (StringUtils.hasText(applicationCode)) {
            whereClause.append(" AND APPLICATION_CODE = :applicationCode");
            params.addValue("applicationCode", applicationCode);
        }

        if (StringUtils.hasText(interfaceCode)) {
            whereClause.append(" AND INTERFACE_CODE = :interfaceCode");
            params.addValue("interfaceCode", interfaceCode);
        }

        if (fromDateTime != null) {
            whereClause.append(" AND LOGTIME >= :fromDateTime");
            params.addValue("fromDateTime", fromDateTime);
        }

        if (toDateTime != null) {
            whereClause.append(" AND LOGTIME <= :toDateTime");
            params.addValue("toDateTime", toDateTime);
        }

        return executePagedQuery(whereClause.toString(), params, offset, size);
    }

    public PagedResponse<LogRecord> searchByTransactionId(
            String transactionId,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG
                WHERE TRIM(TRANSACTION_ID) = :transactionId
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("transactionId", transactionId);

        if (StringUtils.hasText(applicationCode)) {
            whereClause.append(" AND APPLICATION_CODE = :applicationCode");
            params.addValue("applicationCode", applicationCode);
        }

        if (StringUtils.hasText(interfaceCode)) {
            whereClause.append(" AND INTERFACE_CODE = :interfaceCode");
            params.addValue("interfaceCode", interfaceCode);
        }

        if (fromDateTime != null) {
            whereClause.append(" AND LOGTIME >= :fromDateTime");
            params.addValue("fromDateTime", fromDateTime);
        }

        if (toDateTime != null) {
            whereClause.append(" AND LOGTIME <= :toDateTime");
            params.addValue("toDateTime", toDateTime);
        }

        return executePagedQuery(whereClause.toString(), params, offset, size);
    }

    public PagedResponse<LogRecord> searchByLoggedMessage(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        String whereClause = buildLoggedMessageWhereClause(interfaceCode);

        MapSqlParameterSource params = buildLoggedMessageParams(
                searchValue,
                applicationCode,
                interfaceCode,
                fromDateTime,
                toDateTime
        );

        return executePagedQuery(whereClause, params, offset, size);
    }

    public CompletableFuture<PagedResponse<LogRecord>> searchByLoggedMessageAsync(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            Executor executor
    ) {
        int offset = (page - 1) * size;

        String whereClause = buildLoggedMessageWhereClause(interfaceCode);

        CompletableFuture<Long> countFuture = CompletableFuture.supplyAsync(() -> {
            MapSqlParameterSource countParams = buildLoggedMessageParams(
                    searchValue,
                    applicationCode,
                    interfaceCode,
                    fromDateTime,
                    toDateTime
            );

            String countSql = "SELECT COUNT(*) " + whereClause;
            Long totalElementsObj = jdbcTemplate.queryForObject(countSql, countParams, Long.class);
            return totalElementsObj != null ? totalElementsObj : 0L;
        }, executor);

        CompletableFuture<List<LogRecord>> dataFuture = CompletableFuture.supplyAsync(() -> {
            MapSqlParameterSource dataParams = buildLoggedMessageParams(
                    searchValue,
                    applicationCode,
                    interfaceCode,
                    fromDateTime,
                    toDateTime
            );
            dataParams.addValue("offset", offset);
            dataParams.addValue("size", size);

            String dataSql = "SELECT * " + whereClause +
                    " ORDER BY LOGTIME DESC " +
                    " OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY";

            return jdbcTemplate.query(dataSql, dataParams, this::mapRow);
        }, executor);

        return countFuture.thenCombine(dataFuture, (totalElements, content) -> {
            int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
            int number = pageNumberFromOffset(offset, size);
            return new PagedResponse<>(content, totalElements, totalPages, number, size);
        });
    }

    private String buildLoggedMessageWhereClause(String interfaceCode) {
        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG
                WHERE APPLICATION_CODE = :applicationCode
                  AND LOGTIME >= :fromDateTime
                  AND LOGTIME <= :toDateTime
                  AND DBMS_LOB.INSTR(LOGGED_MESSAGE, :searchValue) > 0
                """);

        if (StringUtils.hasText(interfaceCode)) {
            whereClause.append(" AND INTERFACE_CODE = :interfaceCode");
        }

        return whereClause.toString();
    }

    private MapSqlParameterSource buildLoggedMessageParams(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("applicationCode", applicationCode);
        params.addValue("fromDateTime", fromDateTime);
        params.addValue("toDateTime", toDateTime);
        params.addValue("searchValue", searchValue);

        if (StringUtils.hasText(interfaceCode)) {
            params.addValue("interfaceCode", interfaceCode);
        }

        return params;
    }

    private PagedResponse<LogRecord> executePagedQuery(
            String whereClause,
            MapSqlParameterSource params,
            int offset,
            int size
    ) {
        String countSql = "SELECT COUNT(*) " + whereClause;
        Long totalElementsObj = jdbcTemplate.queryForObject(countSql, params, Long.class);
        long totalElements = totalElementsObj != null ? totalElementsObj : 0L;

        String dataSql = "SELECT * " + whereClause +
                " ORDER BY LOGTIME DESC " +
                " OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY";

        params.addValue("offset", offset);
        params.addValue("size", size);

        List<LogRecord> content = jdbcTemplate.query(dataSql, params, this::mapRow);

        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int number = pageNumberFromOffset(offset, size);

        return new PagedResponse<>(content, totalElements, totalPages, number, size);
    }

    private int pageNumberFromOffset(int offset, int size) {
        if (size <= 0) {
            return 0;
        }
        return offset / size;
    }

    private LogRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        LogRecord r = new LogRecord();

        r.setSequenceId(rs.getLong("SEQUENCE_ID"));
        r.setInterfaceCode(rs.getString("INTERFACE_CODE"));
        r.setApplicationCode(rs.getString("APPLICATION_CODE"));
        r.setTransactionId(rs.getString("TRANSACTION_ID"));
        r.setLoggingStage(rs.getString("LOGGING_STAGE"));
        r.setTargetService(rs.getString("TARGET_SERVICE"));
        r.setLogTime(rs.getTimestamp("LOGTIME") != null ? rs.getTimestamp("LOGTIME").toLocalDateTime() : null);
        r.setLoggedMessage(rs.getString("LOGGED_MESSAGE"));
        r.setRecordStatus(rs.getString("RECORD_STATUS"));
        r.setCreatedBy(rs.getString("CREATED_BY"));
        r.setCreatedDate(rs.getTimestamp("CREATED_DATE") != null ? rs.getTimestamp("CREATED_DATE").toLocalDateTime() : null);
        r.setModifiedBy(rs.getString("MODIFIED_BY"));
        r.setModifiedDate(rs.getTimestamp("MODIFIED_DATE") != null ? rs.getTimestamp("MODIFIED_DATE").toLocalDateTime() : null);

        return r;
    }
}