package com.example.logviewer.model;

import java.time.LocalDateTime;

public class DurationBucketRecord {

    private LocalDateTime bucketStart;
    private LocalDateTime bucketEnd;

    private Long transactionCount;

    private Long avgDurationMillis;

    private Long modeDurationMillis;


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

    public Long getTransactionCount() {
        return transactionCount;
    }

    public void setTransactionCount(Long transactionCount) {
        this.transactionCount = transactionCount;
    }

    public Long getAvgDurationMillis() {
        return avgDurationMillis;
    }

    public void setAvgDurationMillis(Long avgDurationMillis) {
        this.avgDurationMillis = avgDurationMillis;
    }

    public Long getModeDurationMillis() {
        return modeDurationMillis;
    }

    public void setModeDurationMillis(Long modeDurationMillis) {
        this.modeDurationMillis = modeDurationMillis;
    }
}