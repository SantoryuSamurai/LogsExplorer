package com.example.logviewer.model;

public class LogSearchResponse<T> {

    private PagedResponse<T> page;
    private LogSummary summary;

    public LogSearchResponse() {
    }

    public LogSearchResponse(PagedResponse<T> page, LogSummary summary) {
        this.page = page;
        this.summary = summary;
    }

    public PagedResponse<T> getPage() {
        return page;
    }

    public void setPage(PagedResponse<T> page) {
        this.page = page;
    }

    public LogSummary getSummary() {
        return summary;
    }

    public void setSummary(LogSummary summary) {
        this.summary = summary;
    }
}