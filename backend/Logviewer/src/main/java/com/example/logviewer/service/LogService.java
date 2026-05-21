package com.example.logviewer.service;

import com.example.logviewer.exception.BadRequestException;
import com.example.logviewer.exception.NotFoundException;
import com.example.logviewer.model.*;
import com.example.logviewer.repository.LogAnalyticsRepository;
import com.example.logviewer.repository.LogDataRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
public class LogService {

    private static final LogSummary EMPTY_SUMMARY = new LogSummary(0, 0, 0);
    private static final int WINDOW_SIZE = 200;

    private final LogDataRepository logDataRepository;
    private final LogAnalyticsRepository logAnalyticsRepository;
    private final Executor logQueryExecutor;

    public LogService(
            LogDataRepository logDataRepository,
            LogAnalyticsRepository logAnalyticsRepository,
            @Qualifier("logQueryExecutor") Executor logQueryExecutor) {
        this.logDataRepository = logDataRepository;
        this.logAnalyticsRepository = logAnalyticsRepository;
        this.logQueryExecutor = logQueryExecutor;
    }

    public List<String> getAllApplicationCodes() {
        return logDataRepository.getAllApplicationCodes();
    }

    public List<String> getInterfaceCodesByApplication(String applicationCode) {
        if (!StringUtils.hasText(applicationCode)) {
            throw new BadRequestException("applicationCode is required");
        }

        String app = applicationCode.trim();
        List<String> result = logDataRepository.getInterfaceCodesByApplication(app);

        if (result.isEmpty()) {
            throw new NotFoundException("No interface codes found for application: " + app);
        }

        return result;
    }

    public List<String> getAllInterfaceCodes() {
        return logDataRepository.getAllInterfaceCodes();
    }

    public CompletableFuture<LogSearchResponse<LogRecord>> searchLogsAsync(
            SearchBy searchBy,
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size,
            boolean includeSummary) {

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
            String app = trim(applicationCode);

            pageFuture = CompletableFuture
                    .supplyAsync(() -> logDataRepository.searchByTransactionId(
                            txId,
                            app,
                            normalizedInterfaceCodes,
                            normalizedCaseType,
                            fromDateTime,
                            toDateTime,
                            page,
                            size,
                            null), logQueryExecutor)
                    .thenApply(result -> {
                        if (result.getContent().isEmpty()) {
                            throw new NotFoundException("Transaction not found: " + txId);
                        }
                        return result;
                    });

            summaryFuture = includeSummary
                    ? CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getSummaryByTransactionId(
                            txId,
                            app,
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime), logQueryExecutor)
                    : CompletableFuture.completedFuture(EMPTY_SUMMARY);

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

            String msg = searchValue.trim();
            String app = applicationCode.trim();

            pageFuture = logDataRepository.searchByLoggedMessageAsync(
                    msg,
                    app,
                    normalizedInterfaceCodes,
                    normalizedCaseType,
                    fromDateTime,
                    toDateTime,
                    page,
                    size,
                    logQueryExecutor);

            summaryFuture = includeSummary
                    ? CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getSummaryForLoggedMessage(
                            msg,
                            app,
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime,
                            normalizedCaseType), logQueryExecutor)
                    : CompletableFuture.completedFuture(EMPTY_SUMMARY);

        } else {
            String app = trim(applicationCode);

            pageFuture = CompletableFuture.supplyAsync(() -> {
                int offset = (page - 1) * size;
                int windowIndex = offset / WINDOW_SIZE;

                List<LogRecord> currentWindow = logDataRepository.searchLogsWindow(
                        app,
                        normalizedInterfaceCodes,
                        normalizedCaseType,
                        fromDateTime,
                        toDateTime,
                        windowIndex);

                List<LogRecord> nextWindow = logDataRepository.searchLogsWindow(
                        app,
                        normalizedInterfaceCodes,
                        normalizedCaseType,
                        fromDateTime,
                        toDateTime,
                        windowIndex + 1);

                return pageFromWindows(currentWindow, nextWindow, page, size, windowIndex);
            }, logQueryExecutor);

            summaryFuture = includeSummary
                    ? CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getSummaryForLogs(
                            app,
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime), logQueryExecutor)
                    : CompletableFuture.completedFuture(EMPTY_SUMMARY);
        }

        return pageFuture.thenCombine(summaryFuture,
                (pageResult, summary) -> new LogSearchResponse<>(pageResult, summary));
    }

    public CompletableFuture<LogSummary> getSummaryAsync(
            SearchBy searchBy,
            String searchValue,
            String applicationCode,
            List<String> interfaceCodes,
            String caseType,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime) {

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new BadRequestException("fromDateTime must be before toDateTime");
        }

        List<String> normalizedInterfaceCodes = normalizeCodes(interfaceCodes);
        String normalizedCaseType = normalizeCaseType(caseType);

        if (searchBy == SearchBy.TRANSACTION_ID) {
            if (!StringUtils.hasText(searchValue)) {
                throw new BadRequestException("searchValue is required for TRANSACTION_ID");
            }

            String txId = searchValue.trim();
            String app = trim(applicationCode);

            return CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getSummaryByTransactionId(
                    txId,
                    app,
                    normalizedInterfaceCodes,
                    fromDateTime,
                    toDateTime), logQueryExecutor);
        }

        if (searchBy == SearchBy.LOGGED_MESSAGE) {
            if (!StringUtils.hasText(searchValue)) {
                throw new BadRequestException("searchValue is required for LOGGED_MESSAGE");
            }
            if (!StringUtils.hasText(applicationCode)) {
                throw new BadRequestException("applicationCode is required for LOGGED_MESSAGE");
            }
            if (fromDateTime == null || toDateTime == null) {
                throw new BadRequestException("fromDateTime and toDateTime are required for LOGGED_MESSAGE");
            }

            String msg = searchValue.trim();
            String app = applicationCode.trim();

            return CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getSummaryForLoggedMessage(
                    msg,
                    app,
                    normalizedInterfaceCodes,
                    fromDateTime,
                    toDateTime,
                    normalizedCaseType), logQueryExecutor);
        }

        String app = trim(applicationCode);

        return CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getSummaryForLogs(
                app,
                normalizedInterfaceCodes,
                fromDateTime,
                toDateTime), logQueryExecutor);
    }

    public CompletableFuture<PagedResponse<InterfaceStatsRecord>> getInterfaceStatsAsync(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size) {
        validatePaging(page, size);

        return CompletableFuture.supplyAsync(() -> logAnalyticsRepository.getInterfaceStats(
                trim(applicationCode),
                normalizeCodes(interfaceCodes),
                fromDateTime,
                toDateTime,
                page,
                size), logQueryExecutor);
    }

    public CompletableFuture<PagedResponse<TransactionDurationRecord>> getTransactionDurationsAsync(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size) {
        validatePaging(page, size);

        return CompletableFuture.supplyAsync(() -> logAnalyticsRepository.searchTransactionDurations(
                trim(applicationCode),
                normalizeCodes(interfaceCodes),
                fromDateTime,
                toDateTime,
                page,
                size), logQueryExecutor);
    }

    public DurationBucketResponse getInterfaceDurationBuckets(
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            String bucket) {
        List<String> normalizedInterfaceCodes = normalizeCodes(interfaceCodes);

        if (normalizedInterfaceCodes == null || normalizedInterfaceCodes.isEmpty()) {
            throw new BadRequestException("interfaceCodes is required");
        }

        if (fromDateTime == null || toDateTime == null) {
            throw new BadRequestException("fromDateTime and toDateTime are required");
        }

        int bucketMinutes = parseBucketToMinutes(bucket);

        return logAnalyticsRepository.getAvgDurationByBucket(
                normalizedInterfaceCodes,
                fromDateTime,
                toDateTime,
                bucketMinutes);
    }

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

        return logDataRepository.executeCustomQuery(query);
    }

    public List<LogRecord> exportLogs(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime) {
        if (fromDateTime == null || toDateTime == null) {
            throw new BadRequestException("fromDateTime and toDateTime are mandatory");
        }

        if (fromDateTime.isAfter(toDateTime)) {
            throw new BadRequestException("fromDateTime must be before toDateTime");
        }

        List<LogRecord> logs = logDataRepository.exportLogs(
                trim(applicationCode),
                normalizeCodes(interfaceCodes),
                fromDateTime,
                toDateTime);

        if (logs.isEmpty()) {
            throw new NotFoundException("No logs found for export");
        }

        return logs;
    }

    private PagedResponse<LogRecord> pageFromWindows(
            List<LogRecord> currentWindow,
            List<LogRecord> nextWindow,
            int page,
            int size,
            int windowIndex) {

        int offset = (page - 1) * size;
        int windowStartOffset = windowIndex * WINDOW_SIZE;

        List<LogRecord> merged = new ArrayList<>();
        if (currentWindow != null) {
            merged.addAll(currentWindow);
        }
        if (nextWindow != null) {
            merged.addAll(nextWindow);
        }

        int localOffset = offset - windowStartOffset;

        if (localOffset < 0 || localOffset >= merged.size()) {
            long total = windowStartOffset + merged.size();
            int totalPages = size <= 0 || total == 0 ? 0 : (int) Math.ceil((double) total / size);
            return new PagedResponse<>(Collections.emptyList(), total, totalPages, page, size, false);
        }

        int toIndex = Math.min(localOffset + size, merged.size());
        List<LogRecord> content = merged.subList(localOffset, toIndex);
        boolean hasNext = toIndex < merged.size();

        long total = windowStartOffset + merged.size() + (hasNext ? 1 : 0);
        int totalPages = size <= 0 || total == 0 ? 0 : (int) Math.ceil((double) total / size);

        return new PagedResponse<>(content, total, totalPages, page, size, hasNext);
    }

    private void validatePaging(int page, int size) {
        if (page < 1) {
            throw new BadRequestException("page must be >= 1");
        }
        if (size < 1) {
            throw new BadRequestException("size must be >= 1");
        }
        if (size > 100) {
            throw new BadRequestException("size must be <= 100");
        }
    }

    private String normalizeCaseType(String caseType) {
        if (!StringUtils.hasText(caseType)) {
            return null;
        }

        String value = caseType.trim().toLowerCase();
        if ("error".equals(value)) {
            value = "failure";
        }

        if (!value.equals("success") && !value.equals("failure")) {
            throw new BadRequestException("caseType must be success or failure");
        }

        return value;
    }

    private List<String> normalizeCodes(List<String> codes) {
        if (codes == null) {
            return null;
        }

        return codes.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .collect(Collectors.toList());
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private int parseBucketToMinutes(String bucket) {
        if (!StringUtils.hasText(bucket)) {
            throw new BadRequestException("bucket is required");
        }

        String normalized = bucket.trim().toLowerCase().replace(" ", "");

        if (normalized.endsWith("mins")) {
            return Integer.parseInt(normalized.replace("mins", ""));
        }
        if (normalized.endsWith("min")) {
            return Integer.parseInt(normalized.replace("min", ""));
        }
        if (normalized.endsWith("hr")) {
            return Integer.parseInt(normalized.replace("hr", "")) * 60;
        }
        if (normalized.endsWith("hrs")) {
            return Integer.parseInt(normalized.replace("hrs", "")) * 60;
        }

        throw new BadRequestException("Invalid bucket format");
    }
}