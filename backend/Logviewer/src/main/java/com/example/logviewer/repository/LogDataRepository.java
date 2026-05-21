package com.example.logviewer.repository;

import com.example.logviewer.config.DbConfig;
import com.example.logviewer.model.CustomQueryResponse;
import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.PagedResponse;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Repository
public class LogDataRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final DbConfig dbConfig;
    private final LogQueryBuilder queryBuilder;

    public LogDataRepository(
            NamedParameterJdbcTemplate jdbcTemplate,
            DbConfig dbConfig,
            LogQueryBuilder queryBuilder) {
        this.jdbcTemplate = jdbcTemplate;
        this.dbConfig = dbConfig;
        this.queryBuilder = queryBuilder;
    }

    private String auditTable() {
        return dbConfig.auditLogTable();
    }

    private String errorTable() {
        return dbConfig.errorLogTable();
    }

    private String configTable() {
        return dbConfig.configLogTable();
    }

    @Cacheable(
            cacheNames = "lookupLists",
            key = "'allApplicationCodes'"
    )
    public List<String> getAllApplicationCodes() {
        String sql = "SELECT DISTINCT APPLICATION_CODE " +
                "FROM " + configTable() + " " +
                "WHERE APPLICATION_CODE IS NOT NULL " +
                "ORDER BY APPLICATION_CODE";

        return jdbcTemplate.queryForList(sql, new MapSqlParameterSource(), String.class);
    }

    @Cacheable(
            cacheNames = "lookupLists",
            key = "'interfaceCodesByApp:' + #applicationCode"
    )
    public List<String> getInterfaceCodesByApplication(String applicationCode) {
        String sql = "SELECT DISTINCT INTERFACE_CODE " +
                "FROM " + configTable() + " " +
                "WHERE APPLICATION_CODE = :applicationCode " +
                "AND INTERFACE_CODE IS NOT NULL " +
                "ORDER BY INTERFACE_CODE";

        return jdbcTemplate.queryForList(
                sql,
                new MapSqlParameterSource("applicationCode", applicationCode),
                String.class);
    }

    @Cacheable(
            cacheNames = "lookupLists",
            key = "'allInterfaceCodes'"
    )
    public List<String> getAllInterfaceCodes() {
        String sql = "SELECT DISTINCT INTERFACE_CODE " +
                "FROM " + configTable() + " " +
                "WHERE INTERFACE_CODE IS NOT NULL " +
                "ORDER BY INTERFACE_CODE";

        return jdbcTemplate.queryForList(sql, new MapSqlParameterSource(), String.class);
    }

    @Cacheable(
            cacheNames = "logPages",
            key = "T(com.example.logviewer.repository.LogDataRepository).cacheKey(" +
                    "'searchLogs', #applicationCode, #interfaceCodes, #caseType, #fromDateTime, #toDateTime, #page, #size, #cachedTotal)"
    )
    public PagedResponse<LogRecord> searchLogs(
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            Long cachedTotal) {
        StringBuilder where = new StringBuilder(
                "FROM " + auditTable() + " l WHERE 1=1");

        MapSqlParameterSource params = new MapSqlParameterSource();

        queryBuilder.appendBaseFilters(
                where, params,
                applicationCode, interfaceCodes, fromDateTime, toDateTime, "l");

        queryBuilder.appendCaseFilter(where, caseType, "l", errorTable());

        return executePagedQuery(where.toString(), params, page, size, cachedTotal);
    }

    @Cacheable(
            cacheNames = "logPages",
            key = "T(com.example.logviewer.repository.LogDataRepository).cacheKey(" +
                    "'searchByTransactionId', #transactionId, #applicationCode, #interfaceCodes, #caseType, #fromDateTime, #toDateTime, #page, #size, #cachedTotal)"
    )
    public PagedResponse<LogRecord> searchByTransactionId(
            String transactionId,
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            Long cachedTotal) {
        StringBuilder where = new StringBuilder(
                "FROM " + auditTable() + " l WHERE TRIM(l.TRANSACTION_ID) = :transactionId");

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("transactionId", transactionId);

        queryBuilder.appendBaseFilters(
                where, params,
                applicationCode, interfaceCodes, fromDateTime, toDateTime, "l");

        queryBuilder.appendCaseFilter(where, caseType, "l", errorTable());

        return executePagedQuery(where.toString(), params, page, size, cachedTotal);
    }

    @Cacheable(
            cacheNames = "logPages",
            key = "T(com.example.logviewer.repository.LogDataRepository).cacheKey(" +
                    "'searchByLoggedMessage', #searchValue, #applicationCode, #interfaceCodes, #caseType, #fromDateTime, #toDateTime, #page, #size, #cachedTotal)"
    )
    public PagedResponse<LogRecord> searchByLoggedMessage(
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            Long cachedTotal) {
        String where = queryBuilder.buildLoggedMessageWhereClause(
                auditTable(),
                interfaceCodes,
                caseType,
                errorTable());

        MapSqlParameterSource params = queryBuilder.buildLoggedMessageParams(
                searchValue,
                applicationCode,
                interfaceCodes,
                fromDateTime,
                toDateTime);

        return executePagedQuery(where, params, page, size, cachedTotal);
    }

    public CompletableFuture<PagedResponse<LogRecord>> searchByLoggedMessageAsync(
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            Executor executor) {
        return CompletableFuture.supplyAsync(() -> searchByLoggedMessage(
                searchValue,
                applicationCode,
                interfaceCodes,
                caseType,
                fromDateTime,
                toDateTime,
                page,
                size,
                null), executor);
    }

    public List<LogRecord> exportLogs(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime) {
        StringBuilder sql = new StringBuilder(
                "SELECT * FROM " + auditTable() + " l " +
                        "WHERE l.LOGTIME >= :fromDateTime AND l.LOGTIME <= :toDateTime");

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("fromDateTime", fromDateTime)
                .addValue("toDateTime", toDateTime);

        queryBuilder.appendBaseFilters(sql, params,
                applicationCode, interfaceCodes, null, null, "l");

        sql.append(" ORDER BY l.LOGTIME DESC");

        return jdbcTemplate.query(sql.toString(), params, this::mapRow);
    }

    public CustomQueryResponse executeCustomQuery(String query) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(query, new MapSqlParameterSource());
        return new CustomQueryResponse(rows);
    }

    private PagedResponse<LogRecord> executePagedQuery(
            String whereClause,
            MapSqlParameterSource params,
            int page,
            int size,
            Long cachedTotal) {
        int offset = Math.max(0, (page - 1) * size);
        int endRow = offset + size + 1;
        params.addValue("offset", offset);
        params.addValue("endRow", endRow);

        String sql = "SELECT * FROM ( " +
                "    SELECT page_data.*, ROWNUM AS rn " +
                "    FROM ( " +
                "        SELECT /*+ FIRST_ROWS */ l.* " +
                whereClause +
                "        ORDER BY l.LOGTIME DESC " +
                "    ) page_data " +
                "    WHERE ROWNUM <= :endRow " +
                ") " +
                "WHERE rn > :offset " +
                "ORDER BY rn";

        List<LogRecord> fetchedRows = jdbcTemplate.query(sql, params, this::mapRow);
        boolean hasNext = fetchedRows.size() > size;
        List<LogRecord> content = hasNext
                ? new ArrayList<>(fetchedRows.subList(0, size))
                : fetchedRows;

        long total;
        if (cachedTotal != null) {
            total = cachedTotal;
        } else {
            total = offset + content.size() + (hasNext ? 1 : 0);
        }

        int totalPages = size <= 0 || total == 0 ? 0 : page + (hasNext ? 1 : 0);

        return new PagedResponse<>(content, total, totalPages, page, size, hasNext);
    }

    private LogRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        LogRecord r = new LogRecord();

        r.setSequenceId(rs.getLong("SEQUENCE_ID"));
        r.setInterfaceCode(rs.getString("INTERFACE_CODE"));
        r.setApplicationCode(rs.getString("APPLICATION_CODE"));
        r.setTransactionId(rs.getString("TRANSACTION_ID"));
        r.setLoggingStage(rs.getString("LOGGING_STAGE"));
        r.setTargetService(rs.getString("TARGET_SERVICE"));
        r.setLogTime(rs.getTimestamp("LOGTIME") != null
                ? rs.getTimestamp("LOGTIME").toLocalDateTime()
                : null);
        r.setLoggedMessage(rs.getString("LOGGED_MESSAGE"));
        r.setRecordStatus(rs.getString("RECORD_STATUS"));
        r.setCreatedBy(rs.getString("CREATED_BY"));
        r.setCreatedDate(rs.getTimestamp("CREATED_DATE") != null
                ? rs.getTimestamp("CREATED_DATE").toLocalDateTime()
                : null);

        return r;
    }

    public static String cacheKey(Object... parts) {
        return java.util.Arrays.stream(parts)
                .map(part -> {

                    if (part instanceof List<?>) {

                        List<?> list = (List<?>) part;

                        return list.stream()
                                .filter(Objects::nonNull)
                                .map(String::valueOf)
                                .sorted()
                                .collect(Collectors.joining(","));
                    }

                    return String.valueOf(part);
                })
                .collect(Collectors.joining("|"));
    }
}