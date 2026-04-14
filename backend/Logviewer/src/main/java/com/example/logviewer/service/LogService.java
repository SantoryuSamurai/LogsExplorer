package com.example.logviewer.service;

import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.PagedResponse;
import com.example.logviewer.model.SearchBy;
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

    public CompletableFuture<PagedResponse<LogRecord>> searchLogsAsync(
            SearchBy searchBy,
            String searchValue,
            String applicationCode,
            String interfaceCode,
            LocalDateTime fromDateTime,
            LocalDateTime toDateTime,
            int page,
            int size
    ) {
        validatePaging(page, size);

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime must be before toDateTime");
        }

        if (searchBy == SearchBy.TRANSACTION_ID) {
            if (!StringUtils.hasText(searchValue)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "searchValue is required for TRANSACTION_ID");
            }
            return CompletableFuture.completedFuture(
                    logRepository.searchByTransactionId(
                            searchValue.trim(),
                            StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                            StringUtils.hasText(interfaceCode) ? interfaceCode.trim() : null,
                            fromDateTime,
                            toDateTime,
                            page,
                            size
                    )
            );
        }

        if (searchBy == SearchBy.LOGGED_MESSAGE) {
            if (!StringUtils.hasText(searchValue)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "searchValue is required for LOGGED_MESSAGE");
            }
            if (!StringUtils.hasText(applicationCode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "applicationCode is required for LOGGED_MESSAGE");
            }
            if (fromDateTime == null || toDateTime == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDateTime and toDateTime are required for LOGGED_MESSAGE");
            }

            return logRepository.searchByLoggedMessageAsync(
                    searchValue.trim(),
                    applicationCode.trim(),
                    StringUtils.hasText(interfaceCode) ? interfaceCode.trim() : null,
                    fromDateTime,
                    toDateTime,
                    page,
                    size,
                    logQueryExecutor
            );
        }

        return CompletableFuture.completedFuture(
                logRepository.searchLogs(
                        StringUtils.hasText(applicationCode) ? applicationCode.trim() : null,
                        StringUtils.hasText(interfaceCode) ? interfaceCode.trim() : null,
                        fromDateTime,
                        toDateTime,
                        page,
                        size
                )
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
}