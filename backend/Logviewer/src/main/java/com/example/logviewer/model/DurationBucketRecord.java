package com.example.logviewer.model;

import java.time.LocalDateTime;

public class DurationBucketRecord {
    private LocalDateTime bucketStart;
    private LocalDateTime bucketEnd;
    private long transactionCount;
    private long avgDurationMillis;

    public LocalDateTime getBucketStart() {
        return bucketStart;
    }

    public void setBucketStart(LocalDateTime bucketStart) {
        this.bucketStart = bucketStart;
    }

    public LocalDateTime getBucketEnd() {
        return bucketEnd;
    }

    public void setBucketEnd(LocalDateTime bucketEnd) {
        this.bucketEnd = bucketEnd;
    }

    public long getTransactionCount() {
        return transactionCount;
    }

    public void setTransactionCount(long transactionCount) {
        this.transactionCount = transactionCount;
    }

    public long getAvgDurationMillis() {
        return avgDurationMillis;
    }

    public void setAvgDurationMillis(long avgDurationMillis) {
        this.avgDurationMillis = avgDurationMillis;
    }
}