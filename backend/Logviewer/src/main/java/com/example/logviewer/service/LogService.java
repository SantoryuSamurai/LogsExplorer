package com.example.logviewer.service;

import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.PagedResponse;
import com.example.logviewer.repository.LogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LogService {

    private final LogRepository logRepository;

    public LogService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    public List<String> getAllApplicationCodes() {
        return logRepository.getAllApplicationCodes();
    }

    public List<String> getInterfaceCodesByApplication(String applicationCode) {
        if (applicationCode == null || applicationCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "applicationCode is required"
            );
        }

        return logRepository.getInterfaceCodesByApplication(applicationCode);
    }

    public List<String> getAllInterfaceCodes() {
        return logRepository.getAllInterfaceCodes();
    }

    public PagedResponse<LogRecord> searchLogs(String applicationCode,
                                               String interfaceCode,
                                               LocalDateTime fromDateTime,
                                               LocalDateTime toDateTime,
                                               int page,
                                               int size) {

        boolean hasText = (applicationCode != null && !applicationCode.isBlank()) ||
                (interfaceCode != null && !interfaceCode.isBlank());

        boolean hasDate = fromDateTime != null || toDateTime != null;

        if (!hasText && !hasDate) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one filter must be provided"
            );
        }

        if (page < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be greater than or equal to 1");
        }

        if (size < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "size must be greater than or equal to 1");
        }

        return logRepository.searchLogs(applicationCode, interfaceCode, fromDateTime, toDateTime, page, size);
    }
}