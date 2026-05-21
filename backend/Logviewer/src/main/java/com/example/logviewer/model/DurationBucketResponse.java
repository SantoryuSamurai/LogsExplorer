package com.example.logviewer.model;

import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

public class DurationBucketResponse {

    private List<DurationBucketRecord> buckets;

    @JsonIgnore 
    private String modeDurationMillis;

    public DurationBucketResponse(List<DurationBucketRecord> buckets, String modeDurationMillis) {
        this.buckets = buckets;
        this.modeDurationMillis = modeDurationMillis;
    }

    public List<DurationBucketRecord> getBuckets() {
        return buckets;
    }

    public void setBuckets(List<DurationBucketRecord> buckets) {
        this.buckets = buckets;
    }

    public String getModeDurationMillis() {
        return modeDurationMillis;
    }

    public void setModeDurationMillis(String modeDurationMillis) {
        this.modeDurationMillis = modeDurationMillis;
    }


    @JsonGetter("modeDurationMillis")
    public Object getModeDurationMillisForJson() {
        return modeDurationMillis == null ? "NA" : modeDurationMillis;
    }
}