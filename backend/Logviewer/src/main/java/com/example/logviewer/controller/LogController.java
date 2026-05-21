package com.example.logviewer.controller;

import com.example.logviewer.model.*;
import com.example.logviewer.service.LogService;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }


    @GetMapping("/application-codes")
    public ResponseEntity<List<String>> getAllApplicationCodes() {
        return ResponseEntity.ok(logService.getAllApplicationCodes());
    }

    @GetMapping("/interface-codes")
    public ResponseEntity<List<String>> getInterfaceCodes(@RequestParam String applicationCode) {
        return ResponseEntity.ok(logService.getInterfaceCodesByApplication(applicationCode));
    }

    @GetMapping("/interface-codes/all")
    public ResponseEntity<List<String>> getAllInterfaceCodes() {
        return ResponseEntity.ok(logService.getAllInterfaceCodes());
    }


    @GetMapping
    public CompletableFuture<ResponseEntity<LogSearchResponse<LogRecord>>> getLogs(
            @RequestParam(required = false) SearchBy searchBy,
            @RequestParam(required = false) String searchValue,
            @RequestParam(required = false) String applicationCode,
            @RequestParam(required = false) List<String> interfaceCodes,
            @RequestParam(required = false) String caseType,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime fromDateTime,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime toDateTime,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "false") boolean includeSummary
    ) {
        return logService.searchLogsAsync(
                searchBy,
                searchValue,
                applicationCode,
                interfaceCodes,
                caseType,
                fromDateTime,
                toDateTime,
                page,
                size,
                includeSummary
        ).thenApply(ResponseEntity::ok);
    }

    @GetMapping("/summary")
    public CompletableFuture<ResponseEntity<LogSummary>> getSummary(
            @RequestParam(required = false) SearchBy searchBy,
            @RequestParam(required = false) String searchValue,
            @RequestParam(required = false) String applicationCode,
            @RequestParam(required = false) List<String> interfaceCodes,
            @RequestParam(required = false) String caseType,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime fromDateTime,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime toDateTime
    ) {
        return logService.getSummaryAsync(
                searchBy,
                searchValue,
                applicationCode,
                interfaceCodes,
                caseType,
                fromDateTime,
                toDateTime
        ).thenApply(ResponseEntity::ok);
    }

    @GetMapping("/interface-stats")
    public CompletableFuture<ResponseEntity<PagedResponse<InterfaceStatsRecord>>> getInterfaceStats(
            @RequestParam(required = false) String applicationCode,
            @RequestParam(required = false) List<String> interfaceCodes,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime fromDateTime,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime toDateTime,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return logService.getInterfaceStatsAsync(
                applicationCode,
                interfaceCodes,
                fromDateTime,
                toDateTime,
                page,
                size
        ).thenApply(ResponseEntity::ok);
    }

    @GetMapping("/durations")
    public CompletableFuture<ResponseEntity<PagedResponse<TransactionDurationRecord>>> getTransactionDurations(
            @RequestParam(required = false) String applicationCode,
            @RequestParam(required = false) List<String> interfaceCodes,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime fromDateTime,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime toDateTime,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return logService.getTransactionDurationsAsync(
                applicationCode,
                interfaceCodes,
                fromDateTime,
                toDateTime,
                page,
                size
        ).thenApply(ResponseEntity::ok);
    }

    
    @GetMapping("/interface-duration-buckets")
    public ResponseEntity<DurationBucketResponse> getInterfaceDurationBuckets(
            @RequestParam List<String> interfaceCodes,
            @RequestParam
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime fromDateTime,
            @RequestParam
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime toDateTime,
            @RequestParam String bucket
    ) {
        return ResponseEntity.ok(
                logService.getInterfaceDurationBuckets(
                        interfaceCodes,
                        fromDateTime,
                        toDateTime,
                        bucket
                )
        );
    }

  

    @PostMapping("/custom-query")
    public ResponseEntity<CustomQueryResponse> executeCustomQuery(
            @RequestBody CustomQueryRequest request
    ) {
        if (request == null || request.getQuery() == null) {
            throw new IllegalArgumentException("Query request cannot be null");
        }

        return ResponseEntity.ok(
                logService.executeCustomQuery(request.getQuery())
        );
    }

  

    @GetMapping("/export")
    public ResponseEntity<ByteArrayResource> exportLogs(
            @RequestParam(required = false) String applicationCode,
            @RequestParam(required = false) List<String> interfaceCodes,
            @RequestParam
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime fromDateTime,
            @RequestParam
            @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime toDateTime
    ) {

        List<LogRecord> logs = logService.exportLogs(
                applicationCode,
                interfaceCodes,
                fromDateTime,
                toDateTime
        );

        String csv = convertToCsv(logs);

        ByteArrayResource resource =
                new ByteArrayResource(csv.getBytes(StandardCharsets.UTF_8));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=logs.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .contentLength(resource.contentLength())
                .body(resource);
    }



    private String convertToCsv(List<LogRecord> logs) {
        StringBuilder sb = new StringBuilder();

        sb.append("SEQUENCE_ID,APPLICATION_CODE,INTERFACE_CODE,TRANSACTION_ID,LOGGING_STAGE,TARGET_SERVICE,LOGTIME,LOGGED_MESSAGE,RECORD_STATUS,CREATED_BY,CREATED_DATE,MODIFIED_BY,MODIFIED_DATE\n");

        for (LogRecord log : logs) {
            sb.append(safe(log.getSequenceId())).append(",");
            sb.append(safe(log.getApplicationCode())).append(",");
            sb.append(safe(log.getInterfaceCode())).append(",");
            sb.append(safe(log.getTransactionId())).append(",");
            sb.append(safe(log.getLoggingStage())).append(",");
            sb.append(safe(log.getTargetService())).append(",");
            sb.append(safe(log.getLogTime())).append(",");
            sb.append(escapeCsv(log.getLoggedMessage())).append(",");
            sb.append(safe(log.getRecordStatus())).append(",");
            sb.append(safe(log.getCreatedBy())).append(",");
            sb.append(safe(log.getCreatedDate())).append(",");
            sb.append(safe(log.getModifiedBy())).append(",");
            sb.append(safe(log.getModifiedDate())).append("\n");
        }

        return sb.toString();
    }

    private String safe(Object value) {
        return value == null ? "" : value.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";

        String escaped = value.replace("\"", "\"\"");

        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}