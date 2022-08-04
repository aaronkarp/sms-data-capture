/*
 *  Copyright 2015 Adobe Systems Incorporated
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.carters.core.servlets;

import org.apache.commons.lang.StringUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import com.carters.core.utils.CommonUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static com.carters.core.utils.CommonUtils.NODE_PATH;
import static com.carters.core.utils.CommonUtils.PROPERTY_NAME;

import javax.servlet.Servlet;
import javax.servlet.ServletException;


import java.io.*;

@Component(service = Servlet.class, property = {
  "sling.servlet.methods=GET",
  "sling.servlet.resourceTypes=carters/components/page",
  "sling.servlet.selectors=data",
  "sling.servlet.extensions=html"
})
public class AJAXProcessServlet extends SlingSafeMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(AJAXProcessServlet.class);

    @Reference
    ResourceResolverFactory resourceResolverFactory;
    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse internalResponse)
            throws ServletException, IOException {
        String endpoint = request.getParameter("endpoint");
        String token = "Bearer " + getAuthToken(request);
        String firstName = request.getParameter("FirstName");
        String lastName = request.getParameter("LastName");
        String emailAddress = request.getParameter("primaryKeyValue");
        String mobileNumber = request.getParameter("mobilenumber");
        String smsEndpoint = request.getParameter("smsEndpoint");
        String shortcode = request.getParameter("shortcode");
        String messageText = request.getParameter("messageText");
        String fullResponseBody = new String("");

        try (CloseableHttpClient httpclient = HttpClients.createDefault()) {
            HttpPost httpPost = new HttpPost(endpoint);
            httpPost.setHeader("Authorization", token);
            httpPost.setHeader("Content-type", "application/json");
            String json = "{\r\n" +
                    "  \"To\": {\r\n" +
                    "  \"Address\": \"" + emailAddress + "\",\r\n" +
                    "  \"SubscriberKey\": \"" + emailAddress + "\",\r\n" +
                    "  \"ContactAttributes\": {\r\n" +
                    "  \"SubscriberAttributes\": {\r\n" +
                    "  \"First Name\": \"" + firstName + "\",\r\n" +
                    "  \"Last Name\": \"" + lastName + "\"\r\n" +
                    "  }\r\n" +
                    "  }\r\n" +
                    "  }\r\n" +
                    "  }";
            StringEntity stringEntity = new StringEntity(json);
            httpPost.setEntity(stringEntity);

            ResponseHandler<String> responseHandler = response -> {
                int status = response.getStatusLine().getStatusCode();
                if (status >= 200 && status < 300) {
                   	log.debug("Response is success");
                    HttpEntity entity = response.getEntity();
                    return entity != null ? EntityUtils.toString(entity) : null;
                } else {
                    log.error("response from sfmc: {} ",EntityUtils.toString(response.getEntity()));
                    throw new ClientProtocolException("Error: " + status);
                }
            };

            String responseBody = httpclient.execute(httpPost, responseHandler);
            fullResponseBody += responseBody;
        }

        if (mobileNumber != null) {
            try (CloseableHttpClient smsHttpclient = HttpClients.createDefault()) {
                HttpPost smsHttpPost = new HttpPost(smsEndpoint);
                smsHttpPost.setHeader("Authorization", token);
                smsHttpPost.setHeader("Content-type", "application/json");
                String smsJson = "{\r\n" +
                        "  \"subscribers\": [\r\n" +
                        "    {\r\n" +
                        "      \"mobilenumber\": \"" + mobileNumber + "\",\r\n" +
                        "      \"subscriberkey\": \"" + emailAddress + "\"\r\n" +
                        "    }\r\n" +
                        "  ],\r\n" +
                        "  \"shortCode\": \"" + shortcode + "\",\r\n" +
                        "  \"messageText\": \"" + messageText + "\"\r\n" +
                        "}";
                StringEntity smsStringEntity = new StringEntity(smsJson);
                smsHttpPost.setEntity(smsStringEntity);

                ResponseHandler<String> smsResponseHandler = smsResponse -> {
                    int smsStatus = smsResponse.getStatusLine().getStatusCode();
                    if (smsStatus >= 200 && smsStatus < 300) {
                        log.debug("SMS response is success");
                        HttpEntity entity = smsResponse.getEntity();
                        return entity != null ? EntityUtils.toString(entity) : null;
                    } else {
                        log.error("response from sfmc SMS: {} ",EntityUtils.toString(smsResponse.getEntity()));
                        throw new ClientProtocolException("Error: " + smsStatus);
                    }
                };

                String smsResponseBody = smsHttpclient.execute(smsHttpPost, smsResponseHandler);
                fullResponseBody += smsResponseBody;
            }
        }
        internalResponse.getWriter().println(fullResponseBody);
    }

    public String getAuthToken(SlingHttpServletRequest request) {
        try {
        	ResourceResolver resolver=CommonUtils.getResourceResolver(resourceResolverFactory);
            String Authtoken = CommonUtils.readFromNode(resolver, PROPERTY_NAME, NODE_PATH);
            if (StringUtils.isNotEmpty(Authtoken)) {
                return Authtoken;
            } else {
                log.error("authToken token empty");
            }
        } catch (Exception e) {
            log.error("Exception occurred");
            e.printStackTrace();
        }
        return null;
    }
}
