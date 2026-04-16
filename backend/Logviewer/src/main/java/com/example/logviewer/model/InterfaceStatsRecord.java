package com.example.logviewer.model;

public class InterfaceStatsRecord {
    private String interfaceCode;
    private long usageCount;
    private long minDurationMillis;
    private long maxDurationMillis;
    private long avgDurationMillis;

    public InterfaceStatsRecord() {
    }

    public InterfaceStatsRecord(String interfaceCode, long usageCount, long minDurationMillis, long maxDurationMillis, long avgDurationMillis) {
        this.interfaceCode = interfaceCode;
        this.usageCount = usageCount;
        this.minDurationMillis = minDurationMillis;
        this.maxDurationMillis = maxDurationMillis;
        this.avgDurationMillis = avgDurationMillis;
    }

    public String getInterfaceCode() {
        return interfaceCode;
    }

    public void setInterfaceCode(String interfaceCode) {
        this.interfaceCode = interfaceCode;
    }

    public long getUsageCount() {
        return usageCount;
    }

    public void setUsageCount(long usageCount) {
        this.usageCount = usageCount;
    }

    public long getMinDurationMillis() {
        return minDurationMillis;
    }

    public void setMinDurationMillis(long minDurationMillis) {
        this.minDurationMillis = minDurationMillis;
    }

    public long getMaxDurationMillis() {
        return maxDurationMillis;
    }

    public void setMaxDurationMillis(long maxDurationMillis) {
        this.maxDurationMillis = maxDurationMillis;
    }

    public long getAvgDurationMillis() {
        return avgDurationMillis;
    }

    public void setAvgDurationMillis(long avgDurationMillis) {
        this.avgDurationMillis = avgDurationMillis;
    }
}