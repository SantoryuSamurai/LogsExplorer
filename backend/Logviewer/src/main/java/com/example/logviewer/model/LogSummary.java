package com.example.logviewer.model;

public class LogSummary {

    private long successCount;
    private long errorCount;
    private long uniqueTransactionCount; // ✅ NEW

    public LogSummary() {}

    public LogSummary(long successCount, long errorCount, long uniqueTransactionCount) {
        this.successCount = successCount;
        this.errorCount = errorCount;
        this.uniqueTransactionCount = uniqueTransactionCount;
    }

    public long getSuccessCount() {
        return successCount;
    }

    public void setSuccessCount(long successCount) {
        this.successCount = successCount;
    }

    public long getErrorCount() {
        return errorCount;
    }

    public void setErrorCount(long errorCount) {
        this.errorCount = errorCount;
    }

    public long getUniqueTransactionCount() {
        return uniqueTransactionCount;
    }

    public void setUniqueTransactionCount(long uniqueTransactionCount) {
        this.uniqueTransactionCount = uniqueTransactionCount;
    }
}