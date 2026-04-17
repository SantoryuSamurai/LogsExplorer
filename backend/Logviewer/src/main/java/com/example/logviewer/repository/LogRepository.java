package com.example.logviewer.repository;

import com.example.logviewer.model.InterfaceStatsRecord;
import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.LogSummary;
import com.example.logviewer.model.PagedResponse;
import com.example.logviewer.model.TransactionDurationRecord;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;
import java.util.LinkedHashMap;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE 1=1
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        appendBaseFilters(whereClause, params, applicationCode, interfaceCode, fromDateTime, toDateTime, "l");
        appendCaseFilter(whereClause, caseType, "l");

        return executePagedQuery(whereClause.toString(), params, offset, size);
    }

    public PagedResponse<LogRecord> searchByTransactionId(
            String transactionId,
            String applicationCode,
            String interfaceCode,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE TRIM(l.TRANSACTION_ID) = :transactionId
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("transactionId", transactionId);

        appendBaseFilters(whereClause, params, applicationCode, interfaceCode, fromDateTime, toDateTime, "l");
        appendCaseFilter(whereClause, caseType, "l");

        return executePagedQuery(whereClause.toString(), params, offset, size);
    }

    public PagedResponse<TransactionDurationRecord> searchTransactionDurations(
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE 1=1
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        appendBaseFilters(whereClause, params, applicationCode, interfaceCode, fromDateTime, toDateTime, "l");
        whereClause.append(" AND l.TRANSACTION_ID IS NOT NULL");

        String groupedSql = """
                FROM (
                    SELECT
                    	TRIM(l.APPLICATION_CODE) AS application_code,
                        TRIM(l.INTERFACE_CODE) AS interface_code,
                        TRIM(l.TRANSACTION_ID) AS transaction_id,
                        MIN(l.LOGTIME) AS first_log_time,
                        MAX(l.LOGTIME) AS last_log_time,
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM BOVOSB.MWTB_IF_ERROR_LOG e
                                WHERE TRIM(e.TRANSACTION_ID) = TRIM(l.TRANSACTION_ID)
                            ) THEN 'FAILURE'
                            ELSE 'SUCCESS'
                        END AS status
                    """ + whereClause + """
                    GROUP BY TRIM(l.APPLICATION_CODE),TRIM(l.INTERFACE_CODE), TRIM(l.TRANSACTION_ID)
                ) x
                """;

        String countSql = "SELECT COUNT(*) " + groupedSql;
        Long totalObj = jdbcTemplate.queryForObject(countSql, params, Long.class);
        long totalElements = totalObj != null ? totalObj : 0L;

        String dataSql = """
                SELECT *
                """ + groupedSql + """
                ORDER BY last_log_time DESC
                OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
                """;

        params.addValue("offset", offset);
        params.addValue("size", size);

        List<TransactionDurationRecord> content = jdbcTemplate.query(dataSql, params, (rs, rowNum) -> {
            TransactionDurationRecord r = new TransactionDurationRecord();
            
            r.setApplicationCode(rs.getString("application_code"));
            r.setInterfaceCode(rs.getString("interface_code"));
            r.setTransactionId(rs.getString("transaction_id"));

            Timestamp first = rs.getTimestamp("first_log_time");
            Timestamp last = rs.getTimestamp("last_log_time");

            LocalDateTime firstTime = first != null ? first.toLocalDateTime() : null;
            LocalDateTime lastTime = last != null ? last.toLocalDateTime() : null;

            r.setFirstLogTime(firstTime);
            r.setLastLogTime(lastTime);

            if (firstTime != null && lastTime != null) {
                r.setDurationMillis(Duration.between(firstTime, lastTime).toMillis());
            } else {
                r.setDurationMillis(0L);
            }

            r.setStatus(rs.getString("status"));
            return r;
        });

        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int number = pageNumberFromOffset(offset, size);

        return new PagedResponse<>(content, totalElements, totalPages, number, size);
    }

    public PagedResponse<LogRecord> searchByLoggedMessage(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        int offset = (page - 1) * size;

        String whereClause = buildLoggedMessageWhereClause(interfaceCode, caseType);

        MapSqlParameterSource params = buildLoggedMessageParams(
                searchValue,
                applicationCode,
                interfaceCode,
                caseType,
                fromDateTime,
                toDateTime
        );

        return executePagedQuery(whereClause, params, offset, size);
    }

    public CompletableFuture<PagedResponse<LogRecord>> searchByLoggedMessageAsync(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            Executor executor
    ) {
        int offset = (page - 1) * size;

        String whereClause = buildLoggedMessageWhereClause(interfaceCode, caseType);

        CompletableFuture<Long> countFuture = CompletableFuture.supplyAsync(() -> {
            MapSqlParameterSource countParams = buildLoggedMessageParams(
                    searchValue,
                    applicationCode,
                    interfaceCode,
                    caseType,
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
                    caseType,
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

    public LogSummary getSummaryForLogs(
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {
        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE 1=1
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        appendBaseFilters(whereClause, params, applicationCode, interfaceCode, fromDateTime, toDateTime, "l");

        return buildSummary(whereClause.toString(), params);
    }

    public LogSummary getSummaryByTransactionId(
            String transactionId,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {
        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE TRIM(l.TRANSACTION_ID) = :transactionId
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("transactionId", transactionId);

        appendBaseFilters(whereClause, params, applicationCode, interfaceCode, fromDateTime, toDateTime, "l");

        return buildSummary(whereClause.toString(), params);
    }

    public LogSummary getSummaryByLoggedMessage(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {
        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE l.APPLICATION_CODE = :applicationCode
                  AND l.LOGTIME >= :fromDateTime
                  AND l.LOGTIME <= :toDateTime
                  AND DBMS_LOB.INSTR(l.LOGGED_MESSAGE, :searchValue) > 0
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("applicationCode", applicationCode);
        params.addValue("fromDateTime", fromDateTime);
        params.addValue("toDateTime", toDateTime);
        params.addValue("searchValue", searchValue);

        if (StringUtils.hasText(interfaceCode)) {
            whereClause.append(" AND l.INTERFACE_CODE = :interfaceCode");
            params.addValue("interfaceCode", interfaceCode);
        }

        return buildSummary(whereClause.toString(), params);
    }

    private LogSummary buildSummary(String whereClause, MapSqlParameterSource params) {
        long successCount = fetchSuccessCount(whereClause, params);
        long errorCount = fetchErrorCount(whereClause, params);
        long uniqueCount = fetchUniqueTransactionCount(whereClause, params);

        return new LogSummary(successCount, errorCount, uniqueCount);
    }

    private long fetchSuccessCount(String whereClause, MapSqlParameterSource params) {

        String sql = new StringBuilder()
                .append("SELECT COUNT(DISTINCT TRIM(l.TRANSACTION_ID)) ")
                .append(whereClause)
                .append(" AND l.TRANSACTION_ID IS NOT NULL")
                .append(" AND NOT EXISTS (")
                .append("     SELECT 1 FROM BOVOSB.MWTB_IF_ERROR_LOG e ")
                .append("     WHERE TRIM(e.TRANSACTION_ID) = TRIM(l.TRANSACTION_ID)")
                .append(" )")
                .toString();

        Long result = jdbcTemplate.queryForObject(sql, params, Long.class);
        return result != null ? result : 0L;
    }

    private long fetchErrorCount(String whereClause, MapSqlParameterSource params) {
        String sql = """
                SELECT COUNT(DISTINCT TRIM(l.TRANSACTION_ID))
                """ + whereClause + """
                  AND l.TRANSACTION_ID IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM BOVOSB.MWTB_IF_ERROR_LOG e
                      WHERE TRIM(e.TRANSACTION_ID) = TRIM(l.TRANSACTION_ID)
                  )
                """;

        Long result = jdbcTemplate.queryForObject(sql, params, Long.class);
        return result != null ? result : 0L;
    }

    private long fetchUniqueTransactionCount(String whereClause, MapSqlParameterSource params) {
        String sql = new StringBuilder()
                .append("SELECT COUNT(DISTINCT TRIM(l.TRANSACTION_ID)) ")
                .append(whereClause)
                .append(" AND l.TRANSACTION_ID IS NOT NULL")
                .toString();

        Long result = jdbcTemplate.queryForObject(sql, params, Long.class);
        return result != null ? result : 0L;
    }

    private String buildLoggedMessageWhereClause(String interfaceCode, String caseType) {
        StringBuilder whereClause = new StringBuilder("""
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE l.APPLICATION_CODE = :applicationCode
                  AND l.LOGTIME >= :fromDateTime
                  AND l.LOGTIME <= :toDateTime
                  AND DBMS_LOB.INSTR(l.LOGGED_MESSAGE, :searchValue) > 0
                """);

        if (StringUtils.hasText(interfaceCode)) {
            whereClause.append(" AND l.INTERFACE_CODE = :interfaceCode");
        }

        appendCaseFilter(whereClause, caseType, "l");
        return whereClause.toString();
    }

    private MapSqlParameterSource buildLoggedMessageParams(
            String searchValue,
            String applicationCode,
            String interfaceCode,
            String caseType,
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

    private void appendBaseFilters(
            StringBuilder whereClause,
            MapSqlParameterSource params,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            String alias
    ) {
        String prefix = alias + ".";

        if (StringUtils.hasText(applicationCode)) {
            whereClause.append(" AND ").append(prefix).append("APPLICATION_CODE = :applicationCode");
            params.addValue("applicationCode", applicationCode);
        }

        if (StringUtils.hasText(interfaceCode)) {
            whereClause.append(" AND ").append(prefix).append("INTERFACE_CODE = :interfaceCode");
            params.addValue("interfaceCode", interfaceCode);
        }

        if (fromDateTime != null) {
            whereClause.append(" AND ").append(prefix).append("LOGTIME >= :fromDateTime");
            params.addValue("fromDateTime", fromDateTime);
        }

        if (toDateTime != null) {
            whereClause.append(" AND ").append(prefix).append("LOGTIME <= :toDateTime");
            params.addValue("toDateTime", toDateTime);
        }
    }

    private void appendCaseFilter(StringBuilder whereClause, String caseType, String alias) {
        if (!StringUtils.hasText(caseType)) {
            return;
        }

        String normalized = caseType.trim().toLowerCase();
        String prefix = alias + ".TRANSACTION_ID";

        if ("success".equals(normalized)) {
            whereClause.append(" AND ").append(prefix).append(" IS NOT NULL")
                    .append(" AND NOT EXISTS (")
                    .append("     SELECT 1 FROM BOVOSB.MWTB_IF_ERROR_LOG e ")
                    .append("     WHERE TRIM(e.TRANSACTION_ID) = TRIM(").append(prefix).append(")")
                    .append(" )");
        } else if ("failure".equals(normalized)) {
            whereClause.append(" AND ").append(prefix).append(" IS NOT NULL")
                    .append(" AND EXISTS (")
                    .append("     SELECT 1 FROM BOVOSB.MWTB_IF_ERROR_LOG e ")
                    .append("     WHERE TRIM(e.TRANSACTION_ID) = TRIM(").append(prefix).append(")")
                    .append(" )");
        }
    }
    
    public PagedResponse<InterfaceStatsRecord> getInterfaceStats(
            String applicationCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    TRIM(l.INTERFACE_CODE) AS interface_code,
                    TRIM(l.TRANSACTION_ID) AS transaction_id,
                    MIN(l.LOGTIME) AS first_log_time,
                    MAX(l.LOGTIME) AS last_log_time
                FROM BOVOSB.MWTB_INTERFACE_AUDIT_LOG l
                WHERE 1=1
                """);

        MapSqlParameterSource params = new MapSqlParameterSource();
        appendBaseFilters(sql, params, applicationCode, null, fromDateTime, toDateTime, "l");
        sql.append(" AND l.INTERFACE_CODE IS NOT NULL");
        sql.append(" AND l.TRANSACTION_ID IS NOT NULL");
        sql.append(" GROUP BY TRIM(l.INTERFACE_CODE), TRIM(l.TRANSACTION_ID)");

        List<InterfaceTransactionSpan> spans = jdbcTemplate.query(sql.toString(), params, (rs, rowNum) -> {
            InterfaceTransactionSpan row = new InterfaceTransactionSpan();
            row.interfaceCode = rs.getString("interface_code");

            Timestamp first = rs.getTimestamp("first_log_time");
            Timestamp last = rs.getTimestamp("last_log_time");

            row.firstLogTime = first != null ? first.toLocalDateTime() : null;
            row.lastLogTime = last != null ? last.toLocalDateTime() : null;
            return row;
        });

        Map<String, StatsAccumulator> map = new LinkedHashMap<>();

        for (InterfaceTransactionSpan span : spans) {
            if (span.interfaceCode == null) {
                continue;
            }

            long durationMillis = 0L;
            if (span.firstLogTime != null && span.lastLogTime != null) {
                durationMillis = Duration.between(span.firstLogTime, span.lastLogTime).toMillis();
            }

            StatsAccumulator acc = map.computeIfAbsent(span.interfaceCode, k -> new StatsAccumulator());
            acc.usageCount++;
            acc.totalDurationMillis += durationMillis;

            if (acc.usageCount == 1) {
                acc.minDurationMillis = durationMillis;
                acc.maxDurationMillis = durationMillis;
            } else {
                acc.minDurationMillis = Math.min(acc.minDurationMillis, durationMillis);
                acc.maxDurationMillis = Math.max(acc.maxDurationMillis, durationMillis);
            }
        }

        List<InterfaceStatsRecord> result = new ArrayList<>();
        for (Map.Entry<String, StatsAccumulator> entry : map.entrySet()) {
            StatsAccumulator acc = entry.getValue();
            long avg = acc.usageCount == 0 ? 0L : Math.round((double) acc.totalDurationMillis / acc.usageCount);

            InterfaceStatsRecord record = new InterfaceStatsRecord();
            record.setInterfaceCode(entry.getKey());
            record.setUsageCount(acc.usageCount);
            record.setMinDurationMillis(acc.minDurationMillis);
            record.setMaxDurationMillis(acc.maxDurationMillis);
            record.setAvgDurationMillis(avg);

            result.add(record);
        }

        result.sort(Comparator
                .comparingLong(InterfaceStatsRecord::getUsageCount).reversed()
                .thenComparing(InterfaceStatsRecord::getInterfaceCode));

        long totalElements = result.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);

        int fromIndex = Math.min((page - 1) * size, result.size());
        int toIndex = Math.min(fromIndex + size, result.size());

        List<InterfaceStatsRecord> pageContent = result.subList(fromIndex, toIndex);

        return new PagedResponse<>(pageContent, totalElements, totalPages, page, size);
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
    
    private static class InterfaceTransactionSpan {
        private String interfaceCode;
        private LocalDateTime firstLogTime;
        private LocalDateTime lastLogTime;
    }

    private static class StatsAccumulator {
        private long usageCount = 0L;
        private long minDurationMillis = 0L;
        private long maxDurationMillis = 0L;
        private long totalDurationMillis = 0L;
    }
}