// assets/js/initial-fetch.js

const API_BASE_URL = "http://localhost:8080/api/logs";

/**
 * Fetches all unique application codes
 */
async function fetchApplicationCodes() {
    try {
        const response = await fetch(`${API_BASE_URL}/application-codes`);
        if (!response.ok) throw new Error("Failed to fetch applications");
        return await response.json(); // Expected: ["APP1", "APP2", ...]
    } catch (error) {
        console.error("Error fetching application codes:", error);
        return [];
    }
}

/**
 * Fetches interface codes. 
 * If appCode is provided, fetches filtered; otherwise fetches all.
 */
async function fetchInterfaceCodes(appCode = "") {
    try {
        let url = appCode 
            ? `${API_BASE_URL}/interface-codes?applicationCode=${appCode}`
            : `${API_BASE_URL}/interface-codes/all`;
            
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch interfaces");
        return await response.json(); // Expected: ["IFACE1", "IFACE2", ...]
    } catch (error) {
        console.error("Error fetching interface codes:", error);
        return [];
    }
}