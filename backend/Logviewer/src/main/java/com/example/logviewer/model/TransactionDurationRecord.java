package com.example.logviewer.model;

import java.time.LocalDateTime;

public class TransactionDurationRecord {
	private String applicationCode;
    private String interfaceCode;
    private String transactionId;
    private LocalDateTime firstLogTime;
    private LocalDateTime lastLogTime;
    private Long durationMillis;
    private String status;
    
    public String getApplicationCode() {
        return applicationCode;
    }

    public void setApplicationCode(String applicationCode) {
        this.applicationCode = applicationCode;
    }
    public String getInterfaceCode() {
        return interfaceCode;
    }

    public void setInterfaceCode(String interfaceCode) {
        this.interfaceCode = interfaceCode;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public LocalDateTime getFirstLogTime() {
        return firstLogTime;
    }

    public void setFirstLogTime(LocalDateTime firstLogTime) {
        this.firstLogTime = firstLogTime;
    }

    public LocalDateTime getLastLogTime() {
        return lastLogTime;
    }

    public void setLastLogTime(LocalDateTime lastLogTime) {
        this.lastLogTime = lastLogTime;
    }

    public Long getDurationMillis() {
        return durationMillis;
    }

    public void setDurationMillis(Long durationMillis) {
        this.durationMillis = durationMillis;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}