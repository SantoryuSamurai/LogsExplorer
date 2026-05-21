package com.example.logviewer.repository;

import com.example.logviewer.config.DbConfig;
import com.example.logviewer.model.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class LogAnalyticsRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final DbConfig dbConfig;
    private final LogQueryBuilder queryBuilder;

    public LogAnalyticsRepository(
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

    private String successTable() {
        return dbConfig.successLogTable();
    }

    private String errorTable() {
        return dbConfig.errorLogTable();
    }

    public LogSummary getSummaryForLogs(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime) {
        StringBuilder baseWhere = new StringBuilder(
                "FROM " + auditTable() + " l WHERE 1=1");

        MapSqlParameterSource params = new MapSqlParameterSource();

        queryBuilder.appendBaseFilters(
                baseWhere, params,
                applicationCode, interfaceCodes, fromDateTime, toDateTime, "l");

        String sql = "WITH base_tx AS ( " +
                "    SELECT DISTINCT TRIM(l.TRANSACTION_ID) AS tx " +
                baseWhere + " AND l.TRANSACTION_ID IS NOT NULL " +
                "), error_tx AS ( " +
                "    SELECT DISTINCT TRIM(e.TRANSACTION_ID) AS tx " +
                "    FROM " + errorTable() + " e " +
                "    WHERE e.TRANSACTION_ID IS NOT NULL " +
                ") " +
                "SELECT " +
                "    COUNT(*) AS unique_count, " +
                "    COALESCE(SUM(CASE WHEN e.tx IS NULL THEN 1 ELSE 0 END), 0) AS success_count, " +
                "    COALESCE(SUM(CASE WHEN e.tx IS NOT NULL THEN 1 ELSE 0 END), 0) AS failure_count " +
                "FROM base_tx b " +
                "LEFT JOIN error_tx e ON e.tx = b.tx";

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> {
            long uniqueCount = rs.getLong("unique_count");
            long successCount = rs.getLong("success_count");
            long failureCount = rs.getLong("failure_count");
            return new LogSummary(successCount, failureCount, uniqueCount);
        });
    }

    public LogSummary getSummaryByTransactionId(
            String transactionId,
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime) {
        StringBuilder baseWhere = new StringBuilder(
                "FROM " + auditTable() + " l WHERE TRIM(l.TRANSACTION_ID) = :transactionId");

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("transactionId", transactionId);

        queryBuilder.appendBaseFilters(
                baseWhere, params,
                applicationCode, interfaceCodes, fromDateTime, toDateTime, "l");

        String sql = "WITH base_tx AS ( " +
                "    SELECT DISTINCT TRIM(l.TRANSACTION_ID) AS tx " +
                baseWhere + " AND l.TRANSACTION_ID IS NOT NULL " +
                "), error_tx AS ( " +
                "    SELECT DISTINCT TRIM(e.TRANSACTION_ID) AS tx " +
                "    FROM " + errorTable() + " e " +
                "    WHERE e.TRANSACTION_ID IS NOT NULL " +
                ") " +
                "SELECT " +
                "    COUNT(*) AS unique_count, " +
                "    COALESCE(SUM(CASE WHEN e.tx IS NULL THEN 1 ELSE 0 END), 0) AS success_count, " +
                "    COALESCE(SUM(CASE WHEN e.tx IS NOT NULL THEN 1 ELSE 0 END), 0) AS failure_count " +
                "FROM base_tx b " +
                "LEFT JOIN error_tx e ON e.tx = b.tx";

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> {
            long uniqueCount = rs.getLong("unique_count");
            long successCount = rs.getLong("success_count");
            long failureCount = rs.getLong("failure_count");
            return new LogSummary(successCount, failureCount, uniqueCount);
        });
    }

    public LogSummary getSummaryForLoggedMessage(
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            String caseType) {
        StringBuilder baseWhere = new StringBuilder(
                "FROM " + auditTable() + " l WHERE l.APPLICATION_CODE = :applicationCode " +
                        "AND l.LOGTIME >= :fromDateTime " +
                        "AND l.LOGTIME <= :toDateTime " +
                        "AND DBMS_LOB.INSTR(l.LOGGED_MESSAGE, :searchValue) > 0");

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("applicationCode", applicationCode)
                .addValue("fromDateTime", fromDateTime)
                .addValue("toDateTime", toDateTime)
                .addValue("searchValue", searchValue);

        if (interfaceCodes != null && !interfaceCodes.isEmpty()) {
            baseWhere.append(" AND TRIM(l.INTERFACE_CODE) IN (:interfaceCodes)");
            params.addValue("interfaceCodes", interfaceCodes);
        }

        queryBuilder.appendCaseFilter(baseWhere, caseType, "l", errorTable());

        String sql = "WITH base_tx AS ( " +
                "    SELECT DISTINCT TRIM(l.TRANSACTION_ID) AS tx " +
                baseWhere + " AND l.TRANSACTION_ID IS NOT NULL " +
                "), error_tx AS ( " +
                "    SELECT DISTINCT TRIM(e.TRANSACTION_ID) AS tx " +
                "    FROM " + errorTable() + " e " +
                "    WHERE e.TRANSACTION_ID IS NOT NULL " +
                ") " +
                "SELECT " +
                "    COUNT(*) AS unique_count, " +
                "    COALESCE(SUM(CASE WHEN e.tx IS NULL THEN 1 ELSE 0 END), 0) AS success_count, " +
                "    COALESCE(SUM(CASE WHEN e.tx IS NOT NULL THEN 1 ELSE 0 END), 0) AS failure_count " +
                "FROM base_tx b " +
                "LEFT JOIN error_tx e ON e.tx = b.tx";

        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> {
            long uniqueCount = rs.getLong("unique_count");
            long successCount = rs.getLong("success_count");
            long failureCount = rs.getLong("failure_count");
            return new LogSummary(successCount, failureCount, uniqueCount);
        });
    }

    public PagedResponse<TransactionDurationRecord> searchTransactionDurations(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size) {
        int offset = (page - 1) * size;

        StringBuilder where = new StringBuilder(
                "FROM " + successTable() + " l WHERE 1=1");

        MapSqlParameterSource params = new MapSqlParameterSource();

        queryBuilder.appendBaseFilters(where, params,
                applicationCode, interfaceCodes, fromDateTime, toDateTime, "l");

        where.append(" AND l.TRANSACTION_ID IS NOT NULL");

        String groupedSql = "FROM ( " +
                "SELECT " +
                "TRIM(l.APPLICATION_CODE) AS application_code, " +
                "TRIM(l.INTERFACE_CODE) AS interface_code, " +
                "TRIM(l.TRANSACTION_ID) AS transaction_id, " +
                "MIN(l.LOGTIME) AS first_log_time, " +
                "MAX(l.LOGTIME) AS last_log_time " +
                where + " " +
                "GROUP BY " +
                "TRIM(l.APPLICATION_CODE), " +
                "TRIM(l.INTERFACE_CODE), " +
                "TRIM(l.TRANSACTION_ID) " +
                ") x";

        String countSql = "SELECT COUNT(*) " + groupedSql;
        Long totalObj = jdbcTemplate.queryForObject(countSql, params, Long.class);
        long totalElements = totalObj != null ? totalObj : 0L;

        params.addValue("offset", offset);
        params.addValue("size", size);

        String dataSql = "SELECT * " + groupedSql + " " +
                "ORDER BY last_log_time DESC " +
                "OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY";

        List<TransactionDurationRecord> content = jdbcTemplate.query(dataSql, params, (rs, rowNum) -> {
            TransactionDurationRecord r = new TransactionDurationRecord();

            r.setApplicationCode(rs.getString("application_code"));
            r.setInterfaceCode(rs.getString("interface_code"));
            r.setTransactionId(rs.getString("transaction_id"));

            Timestamp first = rs.getTimestamp("first_log_time");
            Timestamp last = rs.getTimestamp("last_log_time");

            if (first != null && last != null) {
                r.setFirstLogTime(first.toLocalDateTime());
                r.setLastLogTime(last.toLocalDateTime());
                r.setDurationMillis(last.getTime() - first.getTime());
            } else {
                r.setDurationMillis(0L);
            }

            r.setStatus("SUCCESS");
            return r;
        });

        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);

        return new PagedResponse<>(content, totalElements, totalPages, page, size);
    }

    public PagedResponse<InterfaceStatsRecord> getInterfaceStats(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size) {
        int offset = (page - 1) * size;

        StringBuilder filters = new StringBuilder(" WHERE 1=1 ");
        MapSqlParameterSource params = new MapSqlParameterSource();

        queryBuilder.appendBaseFilters(filters, params,
                applicationCode, interfaceCodes, fromDateTime, toDateTime, "l");

        String baseTable = successTable();

        String sql = "WITH tx_spans AS ( " +
                "SELECT " +
                "TRIM(l.INTERFACE_CODE) AS interface_code, " +
                "TRIM(l.TRANSACTION_ID) AS transaction_id, " +
                "MIN(l.LOGTIME) AS first_log_time, " +
                "MAX(l.LOGTIME) AS last_log_time " +
                "FROM " + baseTable + " l " + filters + " " +
                "AND l.INTERFACE_CODE IS NOT NULL " +
                "AND l.TRANSACTION_ID IS NOT NULL " +
                "GROUP BY TRIM(l.INTERFACE_CODE), TRIM(l.TRANSACTION_ID) " +
                "HAVING COUNT(*) > 1 " +
                "AND MIN(l.LOGTIME) < MAX(l.LOGTIME) " +
                "), " +
                "tx_duration AS ( " +
                "SELECT " +
                "interface_code, " +
                "( " +
                "EXTRACT(DAY FROM (last_log_time - first_log_time)) * 86400000 + " +
                "EXTRACT(HOUR FROM (last_log_time - first_log_time)) * 3600000 + " +
                "EXTRACT(MINUTE FROM (last_log_time - first_log_time)) * 60000 + " +
                "ROUND(EXTRACT(SECOND FROM (last_log_time - first_log_time)) * 1000) " +
                ") AS duration_millis " +
                "FROM tx_spans " +
                "), " +
                "interface_stats AS ( " +
                "SELECT " +
                "interface_code, " +
                "COUNT(*) AS usage_count, " +
                "MIN(duration_millis) AS min_duration_millis, " +
                "MAX(duration_millis) AS max_duration_millis, " +
                "ROUND(AVG(duration_millis)) AS avg_duration_millis " +
                "FROM tx_duration " +
                "WHERE duration_millis > 0 " +
                "GROUP BY interface_code " +
                ") " +
                "SELECT * " +
                "FROM interface_stats " +
                "ORDER BY usage_count DESC, interface_code " +
                "OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY";

        params.addValue("offset", offset);
        params.addValue("size", size);

        List<InterfaceStatsRecord> content = jdbcTemplate.query(sql, params, (rs, rowNum) -> {
            InterfaceStatsRecord r = new InterfaceStatsRecord();
            r.setInterfaceCode(rs.getString("interface_code"));
            r.setUsageCount(rs.getLong("usage_count"));
            r.setMinDurationMillis(rs.getLong("min_duration_millis"));
            r.setMaxDurationMillis(rs.getLong("max_duration_millis"));
            r.setAvgDurationMillis(rs.getLong("avg_duration_millis"));
            return r;
        });

        return new PagedResponse<>(content, content.size(), 1, page, size);
    }

    public DurationBucketResponse getAvgDurationByBucket(
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int bucketMinutes) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("fromDateTime", fromDateTime)
                .addValue("toDateTime", toDateTime)
                .addValue("bucketMinutes", bucketMinutes);

        StringBuilder baseFilter = new StringBuilder(
                "FROM " + successTable() + " l " +
                        "WHERE l.LOGTIME >= :fromDateTime " +
                        "AND l.LOGTIME <= :toDateTime " +
                        "AND l.TRANSACTION_ID IS NOT NULL");

        if (interfaceCodes != null && !interfaceCodes.isEmpty()) {
            baseFilter.append(" AND TRIM(l.INTERFACE_CODE) IN (:interfaceCodes)");
            params.addValue("interfaceCodes", interfaceCodes);
        }

        String bucketSql = "WITH tx_spans AS ( " +
                "SELECT " +
                "TRIM(l.INTERFACE_CODE) AS interface_code, " +
                "TRIM(l.TRANSACTION_ID) AS transaction_id, " +
                "MIN(l.LOGTIME) AS first_log_time, " +
                "MAX(l.LOGTIME) AS last_log_time " +
                baseFilter + " " +
                "GROUP BY TRIM(l.INTERFACE_CODE), TRIM(l.TRANSACTION_ID) " +
                "HAVING COUNT(*) > 1 " +
                "AND MIN(l.LOGTIME) < MAX(l.LOGTIME) " +
                "), " +
                "tx_duration AS ( " +
                "SELECT " +
                "interface_code, " +
                "( " +
                "EXTRACT(DAY FROM (last_log_time - first_log_time)) * 86400000 + " +
                "EXTRACT(HOUR FROM (last_log_time - first_log_time)) * 3600000 + " +
                "EXTRACT(MINUTE FROM (last_log_time - first_log_time)) * 60000 + " +
                "ROUND(EXTRACT(SECOND FROM (last_log_time - first_log_time)) * 1000) " +
                ") AS duration_millis, " +
                "TRUNC(first_log_time) + NUMTODSINTERVAL( " +
                "FLOOR((EXTRACT(HOUR FROM first_log_time) * 60 + EXTRACT(MINUTE FROM first_log_time)) / :bucketMinutes) * :bucketMinutes, "
                +
                "'MINUTE') AS bucket_start " +
                "FROM tx_spans " +
                "), " +
                "bucket_stats AS ( " +
                "SELECT bucket_start, duration_millis " +
                "FROM tx_duration " +
                "WHERE duration_millis > 0 " +
                "), " +
                "mode_calc AS ( " +
                "SELECT bucket_start, duration_millis, COUNT(*) AS freq " +
                "FROM bucket_stats " +
                "GROUP BY bucket_start, duration_millis " +
                "), " +
                "ranked_modes AS ( " +
                "SELECT " +
                "bucket_start, " +
                "duration_millis, " +
                "freq, " +
                "RANK() OVER ( " +
                "PARTITION BY bucket_start " +
                "ORDER BY " +
                "CASE WHEN freq > 1 THEN 0 ELSE 1 END, " +
                "freq DESC, " +
                "duration_millis ASC " +
                ") AS rnk " +
                "FROM mode_calc " +
                "), " +
                "mode_per_bucket AS ( " +
                "SELECT bucket_start, duration_millis AS mode_duration_millis " +
                "FROM ranked_modes " +
                "WHERE rnk = 1 " +
                "), " +
                "final_stats AS ( " +
                "SELECT " +
                "bucket_start, " +
                "COUNT(*) AS transaction_count, " +
                "ROUND(AVG(duration_millis)) AS avg_duration_millis " +
                "FROM bucket_stats " +
                "GROUP BY bucket_start " +
                ") " +
                "SELECT " +
                "f.bucket_start, " +
                "f.bucket_start + NUMTODSINTERVAL(:bucketMinutes, 'MINUTE') AS bucket_end, " +
                "f.transaction_count, " +
                "f.avg_duration_millis, " +
                "m.mode_duration_millis " +
                "FROM final_stats f " +
                "LEFT JOIN mode_per_bucket m " +
                "ON f.bucket_start = m.bucket_start " +
                "ORDER BY f.bucket_start";

        List<DurationBucketRecord> buckets = jdbcTemplate.query(bucketSql, params, (rs, i) -> {
            DurationBucketRecord r = new DurationBucketRecord();
            r.setBucketStart(rs.getTimestamp("bucket_start").toLocalDateTime());
            r.setBucketEnd(rs.getTimestamp("bucket_end").toLocalDateTime());
            r.setTransactionCount(rs.getLong("transaction_count"));
            r.setAvgDurationMillis(rs.getLong("avg_duration_millis"));

            long mode = rs.getLong("mode_duration_millis");
            r.setModeDurationMillis(mode);

            return r;
        });

        String globalMode = calculateGlobalModeFromBuckets(buckets);

        return new DurationBucketResponse(buckets, globalMode);
    }

    private String calculateGlobalModeFromBuckets(List<DurationBucketRecord> buckets) {
        if (buckets == null || buckets.isEmpty()) {
            return "NA";
        }

        Map<Long, Integer> frequencyMap = new HashMap<>();

        for (DurationBucketRecord bucket : buckets) {
            if (bucket == null) {
                continue;
            }

            long modeValue = bucket.getModeDurationMillis();

            if (modeValue <= 0) {
                continue;
            }

            frequencyMap.put(modeValue, frequencyMap.getOrDefault(modeValue, 0) + 1);
        }

        if (frequencyMap.isEmpty()) {
            return "NA";
        }

        Long bestValue = null;
        int bestFrequency = -1;

        for (Map.Entry<Long, Integer> entry : frequencyMap.entrySet()) {
            long value = entry.getKey();
            int freq = entry.getValue();

            if (freq > bestFrequency) {
                bestFrequency = freq;
                bestValue = value;
            } else if (freq == bestFrequency && bestValue != null && value < bestValue) {
                bestValue = value;
            }
        }

        return bestValue != null ? String.valueOf(bestValue) : "NA";
    }
}