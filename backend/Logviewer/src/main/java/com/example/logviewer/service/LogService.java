package com.example.logviewer.service;

import com.example.logviewer.exception.BadRequestException;
import com.example.logviewer.exception.NotFoundException;
import com.example.logviewer.model.*;
import com.example.logviewer.repository.LogRepository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
public class LogService {

    private final LogRepository logRepository;
    private final Executor logQueryExecutor;

    public LogService(LogRepository logRepository,
                      @Qualifier("logQueryExecutor") Executor logQueryExecutor) {
        this.logRepository = logRepository;
        this.logQueryExecutor = logQueryExecutor;
    }

    // -------------------- BASIC APIs --------------------

    public List<String> getAllApplicationCodes() {
        return logRepository.getAllApplicationCodes();
    }

    public List<String> getInterfaceCodesByApplication(String applicationCode) {
        if (!StringUtils.hasText(applicationCode)) {
            throw new BadRequestException("applicationCode is required");
        }

        String app = applicationCode.trim();

        List<String> result = logRepository.getInterfaceCodesByApplication(app);

        if (result.isEmpty()) {
            throw new NotFoundException("No interface codes found for application: " + app);
        }

        return result;
    }

    public List<String> getAllInterfaceCodes() {
        return logRepository.getAllInterfaceCodes();
    }

    // -------------------- MAIN SEARCH --------------------

    public CompletableFuture<LogSearchResponse<LogRecord>> searchLogsAsync(
            SearchBy searchBy,
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        validatePaging(page, size);

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new BadRequestException("fromDateTime must be before toDateTime");
        }

        List<String> normalizedInterfaceCodes = normalizeCodes(interfaceCodes);
        String normalizedCaseType = normalizeCaseType(caseType);

        CompletableFuture<PagedResponse<LogRecord>> pageFuture;
        CompletableFuture<LogSummary> summaryFuture;

        if (searchBy == SearchBy.TRANSACTION_ID) {

            if (!StringUtils.hasText(searchValue)) {
                throw new BadRequestException("searchValue is required for TRANSACTION_ID");
            }

            String txId = searchValue.trim();

            pageFuture = CompletableFuture
                    .completedFuture(
                            logRepository.searchByTransactionId(
                                    txId,
                                    trim(applicationCode),
                                    normalizedInterfaceCodes,
                                    normalizedCaseType,
                                    fromDateTime,
                                    toDateTime,
                                    page,
                                    size
                            )
                    )
                    .thenApply(result -> {
                        if (result.getContent().isEmpty()) {
                            throw new NotFoundException("Transaction not found: " + txId);
                        }
                        return result;
                    });

            summaryFuture = CompletableFuture.supplyAsync(() ->
                    logRepository.getSummaryByTransactionId(
                            txId,
                            trim(applicationCode),
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime
                    ), logQueryExecutor);

        } else if (searchBy == SearchBy.LOGGED_MESSAGE) {

            if (!StringUtils.hasText(searchValue)) {
                throw new BadRequestException("searchValue is required for LOGGED_MESSAGE");
            }
            if (!StringUtils.hasText(applicationCode)) {
                throw new BadRequestException("applicationCode is required for LOGGED_MESSAGE");
            }
            if (fromDateTime == null || toDateTime == null) {
                throw new BadRequestException("fromDateTime and toDateTime are required for LOGGED_MESSAGE");
            }

            pageFuture = logRepository.searchByLoggedMessageAsync(
                    searchValue.trim(),
                    applicationCode.trim(),
                    normalizedInterfaceCodes,
                    normalizedCaseType,
                    fromDateTime,
                    toDateTime,
                    page,
                    size,
                    logQueryExecutor
            );

            summaryFuture = CompletableFuture.completedFuture(new LogSummary(0, 0, 0));

        } else {

            // Generic search → allow empty
            pageFuture = CompletableFuture.completedFuture(
                    logRepository.searchLogs(
                            trim(applicationCode),
                            normalizedInterfaceCodes,
                            normalizedCaseType,
                            fromDateTime,
                            toDateTime,
                            page,
                            size
                    )
            );

            summaryFuture = CompletableFuture.supplyAsync(() ->
                    logRepository.getSummaryForLogs(
                            trim(applicationCode),
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime
                    ), logQueryExecutor);
        }

        return pageFuture.thenCombine(summaryFuture,
                (pageResult, summary) -> new LogSearchResponse<>(pageResult, summary));
    }

    // -------------------- STATS --------------------

    public CompletableFuture<PagedResponse<InterfaceStatsRecord>> getInterfaceStatsAsync(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        validatePaging(page, size);

        return CompletableFuture.supplyAsync(() ->
                logRepository.getInterfaceStats(
                        trim(applicationCode),
                        normalizeCodes(interfaceCodes),
                        fromDateTime,
                        toDateTime,
                        page,
                        size
                ), logQueryExecutor);
    }

    public CompletableFuture<PagedResponse<TransactionDurationRecord>> getTransactionDurationsAsync(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        validatePaging(page, size);

        return CompletableFuture.supplyAsync(() ->
                logRepository.searchTransactionDurations(
                        trim(applicationCode),
                        normalizeCodes(interfaceCodes),
                        fromDateTime,
                        toDateTime,
                        page,
                        size
                ), logQueryExecutor);
    }

    public DurationBucketResponse getInterfaceDurationBuckets(
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            String bucket
    ) {
        List<String> normalizedInterfaceCodes = normalizeCodes(interfaceCodes);

        if (normalizedInterfaceCodes == null || normalizedInterfaceCodes.isEmpty()) {
            throw new BadRequestException("interfaceCodes is required");
        }

        if (fromDateTime == null || toDateTime == null) {
            throw new BadRequestException("fromDateTime and toDateTime are required");
        }

        int bucketMinutes = parseBucketToMinutes(bucket);

        return logRepository.getAvgDurationByBucket(
                normalizedInterfaceCodes,
                fromDateTime,
                toDateTime,
                bucketMinutes
        );
    }

    // -------------------- EXPORT --------------------

    public List<LogRecord> exportLogs(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime
    ) {
        if (fromDateTime == null || toDateTime == null) {
            throw new BadRequestException("fromDateTime and toDateTime are mandatory");
        }

        if (fromDateTime.isAfter(toDateTime)) {
            throw new BadRequestException("fromDateTime must be before toDateTime");
        }

        List<LogRecord> logs = logRepository.exportLogs(
                trim(applicationCode),
                normalizeCodes(interfaceCodes),
                fromDateTime,
                toDateTime
        );

        if (logs.isEmpty()) {
            throw new NotFoundException("No logs found for export");
        }

        return logs;
    }

    // -------------------- CUSTOM QUERY --------------------

    public CustomQueryResponse executeCustomQuery(String query) {

        if (!StringUtils.hasText(query)) {
            throw new BadRequestException("Query cannot be empty");
        }

        String normalized = query.trim().toLowerCase();

        if (!normalized.startsWith("select")) {
            throw new BadRequestException("Only SELECT queries are allowed");
        }

        if (normalized.contains(";")) {
            throw new BadRequestException("Multiple queries not allowed");
        }

        if (normalized.contains("--")) {
            throw new BadRequestException("Invalid query");
        }

        if (normalized.contains("drop") ||
            normalized.contains("delete") ||
            normalized.contains("update") ||
            normalized.contains("insert") ||
            normalized.contains("truncate")) {

            throw new BadRequestException("Invalid query");
        }

        if (!normalized.contains("fetch") && !normalized.contains("limit")) {
            query = query + " FETCH FIRST 100 ROWS ONLY";
        }

        return logRepository.executeCustomQuery(query);
    }

    // -------------------- HELPERS --------------------

    private void validatePaging(int page, int size) {
        if (page < 1) throw new BadRequestException("page must be >= 1");
        if (size < 1) throw new BadRequestException("size must be >= 1");
    }

    private String normalizeCaseType(String caseType) {
        if (!StringUtils.hasText(caseType)) return null;

        String value = caseType.trim().toLowerCase();
        if ("error".equals(value)) value = "failure";

        if (!value.equals("success") && !value.equals("failure")) {
            throw new BadRequestException("caseType must be success or error");
        }

        return value;
    }

    private List<String> normalizeCodes(List<String> codes) {
        if (codes == null) return null;

        return codes.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private int parseBucketToMinutes(String bucket) {
        if (!StringUtils.hasText(bucket)) {
            throw new BadRequestException("bucket is required");
        }

        String normalized = bucket.trim().toLowerCase().replace(" ", "");

        if (normalized.endsWith("mins")) return Integer.parseInt(normalized.replace("mins", ""));
        if (normalized.endsWith("min")) return Integer.parseInt(normalized.replace("min", ""));
        if (normalized.endsWith("hr")) return Integer.parseInt(normalized.replace("hr", "")) * 60;
        if (normalized.endsWith("hrs")) return Integer.parseInt(normalized.replace("hrs", "")) * 60;

        throw new BadRequestException("Invalid bucket format");
    }
}