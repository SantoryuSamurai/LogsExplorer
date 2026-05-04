package com.example.logviewer.model;

import java.util.List;
import java.util.Map;

public class CustomQueryResponse {

    private List<Map<String, Object>> rows;

    public CustomQueryResponse(List<Map<String, Object>> rows) {
        this.rows = rows;
    }

    public List<Map<String, Object>> getRows() {
        return rows;
    }
}