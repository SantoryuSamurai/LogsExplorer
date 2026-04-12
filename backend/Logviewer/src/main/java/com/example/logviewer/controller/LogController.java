package com.example.logviewer.controller;

import com.example.logviewer.model.LogRecord;
import com.example.logviewer.model.PagedResponse;
import com.example.logviewer.service.LogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "http://127.0.0.1:5501")
public class LogController {

    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    @GetMapping("/application-codes")
    public List<String> getAllApplicationCodes() {
        return logService.getAllApplicationCodes();
    }

    @GetMapping("/interface-codes")
    public List<String> getInterfaceCodes(@RequestParam String applicationCode) {
        return logService.getInterfaceCodesByApplication(applicationCode);
    }

    @GetMapping("/interface-codes/all")
    public List<String> getAllInterfaceCodes() {
        return logService.getAllInterfaceCodes();
    }

    @GetMapping
    public PagedResponse<LogRecord> getLogs(
            @RequestParam(required = false) String applicationCode,
            @RequestParam(required = false) String interfaceCode,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDateTime,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDateTime,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return logService.searchLogs(applicationCode, interfaceCode, fromDateTime, toDateTime, page, size);
    }
}