package com.example.logviewer.model;

import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

public class DurationBucketResponse {

    private List<DurationBucketRecord> buckets;

    // Keep internal type as Long
    @JsonIgnore // prevent default serialization
    private Long modeDurationMillis;

    public DurationBucketResponse(List<DurationBucketRecord> buckets, Long modeDurationMillis) {
        this.buckets = buckets;
        this.modeDurationMillis = modeDurationMillis;
    }

    public List<DurationBucketRecord> getBuckets() {
        return buckets;
    }

    public void setBuckets(List<DurationBucketRecord> buckets) {
        this.buckets = buckets;
    }

    public Long getModeDurationMillis() {
        return modeDurationMillis;
    }

    public void setModeDurationMillis(Long modeDurationMillis) {
        this.modeDurationMillis = modeDurationMillis;
    }

    // ✅ Custom JSON output
    @JsonGetter("modeDurationMillis")
    public Object getModeDurationMillisForJson() {
        return modeDurationMillis == null ? "NA" : modeDurationMillis;
    }
}