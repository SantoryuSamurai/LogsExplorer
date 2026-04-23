package com.example.logviewer.service;

import com.example.logviewer.model.DurationBucketRecord;
import com.example.logviewer.model.InterfaceStatsRecord;
import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.LogSearchResponse;
import com.example.logviewer.model.LogSummary;
import com.example.logviewer.model.PagedResponse;
import com.example.logviewer.model.SearchBy;
import com.example.logviewer.model.TransactionDurationRecord;
import com.example.logviewer.repository.LogRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

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

    public List<String> getAllApplicationCodes() {
        return logRepository.getAllApplicationCodes();
    }

    public List<String> getInterfaceCodesByApplication(String applicationCode) {
        if (!StringUtils.hasText(applicationCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "applicationCode is required");
        }
        return logRepository.getInterfaceCodesByApplication(applicationCode.trim());
    }

    public List<String> getAllInterfaceCodes() {
        return logRepository.getAllInterfaceCodes();
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
            int size
    ) {
        validatePaging(page, size);

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime must be before toDateTime");
        }

        List<String> normalizedInterfaceCodes = normalizeCodes(interfaceCodes);
        String normalizedCaseType = normalizeCaseType(caseType);

        CompletableFuture<PagedResponse<LogRecord>> pageFuture;
        CompletableFuture<LogSummary> summaryFuture;

        if (searchBy == SearchBy.TRANSACTION_ID) {
            if (!StringUtils.hasText(searchValue)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "searchValue is required for TRANSACTION_ID");
            }

            String txId = searchValue.trim();

            pageFuture = CompletableFuture.completedFuture(
                    logRepository.searchByTransactionId(
                            txId,
                            StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                            normalizedInterfaceCodes,
                            normalizedCaseType,
                            fromDateTime,
                            toDateTime,
                            page,
                            size
                    )
            );

            summaryFuture = CompletableFuture.supplyAsync(() ->
                    logRepository.getSummaryByTransactionId(
                            txId,
                            StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime
                    ), logQueryExecutor);

        } else if (searchBy == SearchBy.LOGGED_MESSAGE) {
            if (!StringUtils.hasText(searchValue)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "searchValue is required for LOGGED_MESSAGE");
            }
            if (!StringUtils.hasText(applicationCode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "applicationCode is required for LOGGED_MESSAGE");
            }
            if (fromDateTime == null || toDateTime == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime and toDateTime are required for LOGGED_MESSAGE");
            }

            String msg = searchValue.trim();
            String app = applicationCode.trim();

            pageFuture = logRepository.searchByLoggedMessageAsync(
                    msg,
                    app,
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
            pageFuture = CompletableFuture.completedFuture(
                    logRepository.searchLogs(
                            StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
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
                            StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                            normalizedInterfaceCodes,
                            fromDateTime,
                            toDateTime
                    ), logQueryExecutor);
        }

        return pageFuture.thenCombine(summaryFuture,
                (pageResult, summary) -> new LogSearchResponse<>(pageResult, summary));
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

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime must be before toDateTime");
        }

        return CompletableFuture.supplyAsync(() ->
                logRepository.searchTransactionDurations(
                        StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                        normalizeCodes(interfaceCodes),
                        fromDateTime,
                        toDateTime,
                        page,
                        size
                ), logQueryExecutor);
    }

    public CompletableFuture<PagedResponse<InterfaceStatsRecord>> getInterfaceStatsAsync(
            String applicationCode,
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        validatePaging(page, size);

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime must be before toDateTime");
        }

        return CompletableFuture.supplyAsync(() ->
                logRepository.getInterfaceStats(
                        StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                        normalizeCodes(interfaceCodes),
                        fromDateTime,
                        toDateTime,
                        page,
                        size
                ), logQueryExecutor);
    }

    public List<DurationBucketRecord> getInterfaceDurationBuckets(
            List<String> interfaceCodes,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            String bucket
    ) {
        List<String> normalizedInterfaceCodes = normalizeCodes(interfaceCodes);
        if (normalizedInterfaceCodes == null || normalizedInterfaceCodes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "interfaceCodes is required");
        }
        if (fromDateTime == null || toDateTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime and toDateTime are required");
        }
        if (fromDateTime.isAfter(toDateTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime must be before toDateTime");
        }

        int bucketMinutes = parseBucketToMinutes(bucket);

        return logRepository.getAvgDurationByBucket(
                normalizedInterfaceCodes,
                fromDateTime,
                toDateTime,
                bucketMinutes
        );
    }

    private void validatePaging(int page, int size) {
        if (page < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be greater than or equal to 1");
        }
        if (size < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "size must be greater than or equal to 1");
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

        if (!"success".equals(value) && !"failure".equals(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "caseType must be success or error");
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
                .toList();
    }

    private int parseBucketToMinutes(String bucket) {
        if (!StringUtils.hasText(bucket)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bucket is required");
        }

        String normalized = bucket.trim().toLowerCase().replace(" ", "");

        if (normalized.endsWith("mins")) {
            String num = normalized.substring(0, normalized.length() - 4);
            return parsePositiveInt(num, bucket);
        }

        if (normalized.endsWith("min")) {
            String num = normalized.substring(0, normalized.length() - 3);
            return parsePositiveInt(num, bucket);
        }

        if (normalized.endsWith("hr")) {
            String num = normalized.substring(0, normalized.length() - 2);
            return parsePositiveInt(num, bucket) * 60;
        }

        if (normalized.endsWith("hrs")) {
            String num = normalized.substring(0, normalized.length() - 3);
            return parsePositiveInt(num, bucket) * 60;
        }

        if (normalized.endsWith("hour")) {
            String num = normalized.substring(0, normalized.length() - 4);
            return parsePositiveInt(num, bucket) * 60;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "bucket must be like 10mins, 1hr, 2hr"
        );
    }

    private int parsePositiveInt(String value, String originalBucket) {
        try {
            int minutes = Integer.parseInt(value);
            if (minutes <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bucket must be greater than 0: " + originalBucket);
            }
            return minutes;
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid bucket value: " + originalBucket);
        }
    }
}