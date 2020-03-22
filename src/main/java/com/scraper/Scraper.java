package com.scraper;


import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpEntity;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.config.SocketConfig;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.json.CDL;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.logging.Level;
import java.util.logging.Logger;

public class Scraper {
    /* Add here the path where the file needs to get generated */
    private static final String PATH_TO_GENERATE_CSV = "/Users/vivmaheshwari/";

    private static final Logger LOGGER = Logger.getLogger(Scraper.class.getName());
    private static final String MCF51MM256CLL = "MCF51MM256CLL";
    private static final String BASE_URL_DISTRIBUTORS_MCF51MM256CLL = "https://www.nxp.com/webapp/location/rest/v1/distributor/query/MCF51MM256CLL/location/~location~/0.sp";
    private static final String BASE_URL_OVERVIEW_MCF51MM256CLL = "https://www.nxp.com/webapp/parametric/json.sp?basicType=MCF51MM256CLL";
    private static final String MPXV5050GP = "MPXV5050GP";
    private static final String BASE_URL_DISTRIBUTORS_MPXV5050GP = "https://www.nxp.com/webapp/location/rest/v1/distributor/query/MPXV5050GP/location/~location~/0.sp";
    private static final String BASE_URL_OVERVIEW_MPXV5050GP = "https://www.nxp.com/webapp/parametric/json.sp?basicType=MPXV5050GP";

    private static final String APPLICATION_JSON_ALL = "application/json, text/plain, */*";
    private static final String ACCEPT = "accept";


    public static void main(String[] args) throws IOException {
        String pathToGenerateTheFile = null;
        if(args.length > 0) {
            pathToGenerateTheFile = args[0];
        }
        LOGGER.log(Level.INFO, "pathToGenerateTheFile" + pathToGenerateTheFile);


        RequestConfig requestConfig = RequestConfig.custom().setConnectTimeout(10000).build();
        SocketConfig socketConfig = SocketConfig.custom().setSoTimeout(10000).build();
        CloseableHttpClient httpclient = HttpClients.custom().setDefaultRequestConfig(requestConfig).setDefaultSocketConfig(socketConfig).build();
        try {
            String responseBodyDistributors_MCF51MM256CLL = fetchDistributorsData(httpclient, BASE_URL_DISTRIBUTORS_MCF51MM256CLL);
            String responseBodyOverview_MCF51MM256CLL = fetchOverviewData(httpclient, BASE_URL_OVERVIEW_MCF51MM256CLL);
            JSONArray finalJsonObjectToConvert_MCF51MM256CLL = massageResponse(responseBodyDistributors_MCF51MM256CLL, responseBodyOverview_MCF51MM256CLL, MCF51MM256CLL);

            String responseBodyDistributors_MPXV5050GP = fetchDistributorsData(httpclient, BASE_URL_DISTRIBUTORS_MPXV5050GP);
            String responseBodyOverview_MPXV5050GP = fetchOverviewData(httpclient, BASE_URL_OVERVIEW_MPXV5050GP);
            JSONArray finalJsonObjectToConvert_MPXV5050GP = massageResponse(responseBodyDistributors_MPXV5050GP, responseBodyOverview_MPXV5050GP, MPXV5050GP);

            JSONArray finalJsonObjectToConvert = new JSONArray(finalJsonObjectToConvert_MCF51MM256CLL.toString());
            finalJsonObjectToConvert.put(finalJsonObjectToConvert_MPXV5050GP);

            for (int i=0; i< finalJsonObjectToConvert_MPXV5050GP.length(); i++){
                finalJsonObjectToConvert.put(finalJsonObjectToConvert_MPXV5050GP.getJSONObject(i));
            }

            LOGGER.log(Level.INFO, "finalJsonObjectToConvert" + finalJsonObjectToConvert);

            convertJsonToCsv(pathToGenerateTheFile, finalJsonObjectToConvert);

        } catch (IOException ex) {
            LOGGER.log(Level.SEVERE, "Error occurred while processing" + ex.getMessage());
            ex.printStackTrace();
        } finally {
            if (httpclient != null)
                httpclient.close();
        }

    }

    private static String fetchDistributorsData(CloseableHttpClient httpclient, String url) throws IOException {
        return fetchData(httpclient, url);
    }

    private static String fetchOverviewData(CloseableHttpClient httpclient, String url) throws IOException {
        return fetchData(httpclient, url);
    }

    private static String fetchData(CloseableHttpClient httpclient, String url) throws IOException {
        HttpGet httpGet = new HttpGet(url);
        httpGet.addHeader(ACCEPT, APPLICATION_JSON_ALL);

        CloseableHttpResponse closeableHttpResponse = httpclient.execute(httpGet);
        HttpEntity entity = closeableHttpResponse.getEntity();
        return entity != null ? EntityUtils.toString(entity) : null;
    }

    private static JSONArray massageResponse(String responseBodyDistributors, String responseBodyOverview, String component) throws IOException {
        if (StringUtils.isNotEmpty(responseBodyDistributors)) {
            JSONObject responseJsonDistributors = new JSONObject(responseBodyDistributors);
            JSONArray distributors = responseJsonDistributors.getJSONArray("distributors");

            JSONObject responseJsonOverview = new JSONObject(responseBodyOverview);
            JSONObject overview = responseJsonOverview.getJSONObject("Overview");
            String description = overview.getString("description");

            JSONArray finalJsonObjectToConvert = new JSONArray();

            for (int i = 0; i < distributors.length(); i++) {
                JSONObject singleDistributorElement = (JSONObject) distributors.get(i);
                singleDistributorElement.put("description" , new StringBuilder(component).append(" ").append(description));
                singleDistributorElement.put("component_name" , component);
                finalJsonObjectToConvert.put(singleDistributorElement);
            }
            return finalJsonObjectToConvert;
        }
        return null;
    }

    private static void convertJsonToCsv(String pathToGenerateCsv, JSONArray distributors) throws IOException {
        if(pathToGenerateCsv == null || pathToGenerateCsv == "") {
            pathToGenerateCsv = PATH_TO_GENERATE_CSV;
        }
        File file = new File(pathToGenerateCsv + "distributors.csv");
        String csv = CDL.toString(distributors);
        FileUtils.writeStringToFile(file, csv, Charset.forName("UTF-8"));
    }
}
