/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~ Copyright 2025 Padde Software
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
const vscode = require('vscode');
const fs = require('fs-extra');
const path = require('path');
const { GraphQLClient, gql } = require('graphql-request');
const LICENSE_HEADER = `/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~ Copyright ${new Date().getFullYear()} Padde Software
 ~ Licensed under the MIT License, Version 2.0 (the "License");
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/`;
// Configuration
const CONFIG = {
    HTL: {
        SNIPPETS: {
            'data-sly-use': {
                prefix: 'data-sly-use',
                body: ['data-sly-use.${1:localVariable}=${2:model}'],
                description: 'data-sly-use statement for Sling Models'
            },
            'data-sly-resource': {
                prefix: 'data-sly-resource',
                body: ['data-sly-resource="${1:./child}"'],
                description: 'Include a resource'
            },
            'data-sly-include': {
                prefix: 'data-sly-include',
                body: ['data-sly-include="${1:template.html}"'],
                description: 'Include a template'
            },
            'data-sly-test': {
                prefix: 'data-sly-test',
                body: ['data-sly-test="${1:condition}"'],
                description: 'Conditional rendering'
            },
            'data-sly-list': {
                prefix: 'data-sly-list',
                body: ['data-sly-list="${1:item} in ${2:items}"', '    ${3:${1}}', '/data-sly-list'],
                description: 'List iteration'
            },
            'data-sly-repeat': {
                prefix: 'data-sly-repeat',
                body: ['data-sly-repeat="${1:item} in ${2:items}"', '    ${3:${1}}', '/data-sly-repeat'],
                description: 'Repeat content'
            },
            'data-sly-text': {
                prefix: 'data-sly-text',
                body: ['data-sly-text="${1:expression}"'],
                description: 'Output text'
            },
            'data-sly-attribute': {
                prefix: 'data-sly-attribute',
                body: ['data-sly-attribute.${1:attribute}="${2:value}"'],
                description: 'Set HTML attribute'
            },
            'data-sly-element': {
                prefix: 'data-sly-element',
                body: ['data-sly-element="${1:div}"'],
                description: 'Set HTML element'
            },
            'data-sly-template': {
                prefix: 'data-sly-template',
                body: ['<template data-sly-template.${1:name}="${2:params}"', '          data-sly-use.template="${3:template}">', '    ${4:<!-- Content -->}', '</template>'],
                description: 'Define a template'
            },
            'data-sly-call': {
                prefix: 'data-sly-call',
                body: ['data-sly-call="${1:template} @ ${2:params}"'],
                description: 'Call a template'
            },
            'data-sly-unwrap': {
                prefix: 'data-sly-unwrap',
                body: ['data-sly-unwrap'],
                description: 'Remove wrapper element'
            },
            'data-sly-include-clientlib': {
                prefix: 'data-sly-include-clientlib',
                body: ['<sly data-sly-include="/libs/wcm/foundation/components/page/customheaderlibs.html"',
                    '     data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html"',
                    '     data-sly-call="${clientlib.all @ categories=\'${1:clientlib.category}\'}"',
                    '     data-sly-unwrap></sly>'],
                description: 'Include client library'
            }
        }
    },
    GRAPHQL: {
        TYPES: {
            'Query': 'GraphQL Query'
        }
    }
};

// Sling Model configuration class
class SlingModelConfig {
    constructor() {
        this.modelType = 'component';
        this.packageName = '';
        this.modelName = '';
        this.resourceType = '';
        this.injectables = [];
        this.fields = [];
        this.useSlingExporter = false;
        this.exporterName = '';
        this.exporterExtensions = [];
        this.includeLicense = true;
    }
}

// GraphQL Model configuration
class GraphQLModelConfig {
    constructor() {
        this.modelName = '';
        this.fields = [];
        this.endpoint = vscode.workspace.getConfiguration('aem').get('graphql.endpoint');
    }
}
// Field types for Sling Models
const FIELD_TYPES = {
    STRING: 'String',
    STRING_ARRAY: 'String[]',
    INTEGER: 'int',
    LONG: 'long',
    DOUBLE: 'double',
    BOOLEAN: 'boolean',
    CALENDAR: 'Calendar',
    RESOURCE: 'Resource',
    RESOLVER: 'ResourceResolver',
    SESSION: 'Session',
    REQUEST: 'SlingHttpServletRequest',
    RESPONSE: 'SlingHttpServletResponse',
    COMPONENT: 'Component',
    PAGE: 'Page',
    PAGE_MANAGER: 'PageManager',
    DESIGN: 'Design',
    STYLE: 'Style',
    CURRENT_DESIGN: 'Design (current)',
    LOGGER: 'Logger (SLF4J)'
};

// Sling Model templates
const SLING_MODEL_TEMPLATES = {
    'component': {
        name: 'Component Model',
        description: 'Sling Model for reading component content',
        template: (config) => `${config.includeLicense ? LICENSE_HEADER : ''}
package ${config.packageName};

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.*;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.commons.lang3.StringUtils;
import javax.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.inject.*;
${config.useSlingExporter ? 'import org.apache.sling.models.annotations.Exporter;\n' : ''}
/**
 * Sling Model for ${config.modelName}
 * 
 * Adapts from Resource.class to read component content
 */
@Model(adaptables = Resource.class, 
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL${config.useSlingExporter ? `,\n       resourceType = "${config.resourceType}"` : ''})
${config.useSlingExporter ? `@Exporter(name = "${config.exporterName}"${config.exporterExtensions.length > 0 ? `, extensions = {"${config.exporterExtensions.join('", "')}"}` : ''})` : ''}
public class ${config.modelName} {
    
    private static final Logger LOG = LoggerFactory.getLogger(${config.modelName}.class);
    
    @Self
    private Resource resource;
    
    ${config.fields.map(field => generateFieldCode(field)).join('\n\n    ')}
    
    @PostConstruct
    protected void init() {
        try {
            // Initialize any complex properties or perform additional setup
            LOG.debug("Initializing ${config.modelName} with resource: {}", resource.getPath());
        } catch (Exception e) {
            LOG.error("Error initializing ${config.modelName}", e);
        }
    }
    
    /**
     * @return the SLF4J logger instance
     */
    protected Logger getLogger() {
        return LOG;
    }
    
    /**
     * @return the resource
     */
    public Resource getResource() {
        return resource;
    }
    
    ${config.fields.map(field => generateGetterSetter(field)).join('\n\n    ')}
}`
    },
    'request': {
        name: 'Request Model',
        description: 'Sling Model for request processing and dialog interaction',
        template: (config) => `${config.includeLicense ? LICENSE_HEADER : ''}
package ${config.packageName};

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.*;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import javax.annotation.PostConstruct;
import org.apache.sling.api.resource.Resource;
import com.day.cq.wcm.api.Page;
import com.day.cq.wcm.api.PageManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.inject.*;

/**
 * Request Model for ${config.modelName}
 * 
 * Adapts from SlingHttpServletRequest for request context and dialog interaction
 */
@Model(adaptables = SlingHttpServletRequest.class, 
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class ${config.modelName} {
    
    private static final Logger LOG = LoggerFactory.getLogger(${config.modelName}.class);
    
    @Self
    private SlingHttpServletRequest request;
    
    @ScriptVariable
    private Page currentPage;
    
    @ScriptVariable
    private PageManager pageManager;
    
    @ScriptVariable
    private Resource resource;
    
    ${config.fields.map(field => generateFieldCode(field)).join('\n\n    ')}
    
    @PostConstruct
    protected void init() {
        try {
            // Initialize any complex properties or perform additional setup
            LOG.debug("Initializing ${config.modelName} for request: {}", request.getRequestURI());
        } catch (Exception e) {
            LOG.error("Error initializing ${config.modelName}", e);
        }
    }
    
    /**
     * @return the SLF4J logger instance
     */
    protected Logger getLogger() {
        return LOG;
    }
    
    /**
     * @return the request
     */
    public SlingHttpServletRequest getRequest() {
        return request;
    }
    
    /**
     * @return the current page
     */
    public Page getCurrentPage() {
        return currentPage;
    }
    
    /**
     * @return the page manager
     */
    public PageManager getPageManager() {
        return pageManager;
    }
    
    /**
     * @return the resource
     */
    public Resource getResource() {
        return resource;
    }
    
    ${config.fields.map(field => generateGetterSetter(field)).join('\n\n    ')}
}`
    },
    'exporter': {
        name: 'Exporter Model',
        description: 'Sling Model with Sling Model Exporter',
        template: (config) => `${config.includeLicense ? LICENSE_HEADER : ''}
package ${config.packageName};

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.*;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.ExporterOption;
import org.apache.sling.models.factory.ExportException;
import org.apache.sling.api.resource.Resource;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.inject.*;
/**
 * Exporter Model for ${config.modelName}
 * 
 * Provides JSON/XML export capabilities for the component
 */
@Model(adaptables = SlingHttpServletRequest.class, 
       resourceType = "${config.resourceType}",
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
@Exporter(name = "${config.exporterName}", 
          extensions = {"${config.exporterExtensions.join('", "')}"}${config.exporterOptions ? ',\n          ' + config.exporterOptions.map(opt => `@ExporterOption(name = "${opt.name}", value = "${opt.value}")`).join('\n          ') : ''})
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ${config.modelName} {
    
    private static final Logger LOG = LoggerFactory.getLogger(${config.modelName}.class);
    
    @Self
    private SlingHttpServletRequest request;
    
    @ScriptVariable
    private Resource resource;
    
    ${config.fields.map(field => generateFieldCode(field)).join('\n\n    ')}
    
    @PostConstruct
    protected void init() {
        try {
            // Initialize any complex properties or perform additional setup
            LOG.debug("Initializing ${config.modelName} for export with resource: {}", 
                     resource != null ? resource.getPath() : "null");
        } catch (Exception e) {
            LOG.error("Error initializing ${config.modelName}", e);
        }
    }
    
    /**
     * @return the SLF4J logger instance
     */
    protected Logger getLogger() {
        return LOG;
    }
    
    @JsonIgnore
    public SlingHttpServletRequest getRequest() {
        return request;
    }
    
    @JsonIgnore
    public Resource getResource() {
        return resource;
    }
    
    ${config.fields.map(field => generateGetterSetter(field)).join('\n\n    ')}
    
    /**
     * Export the model as a map
     * @return Map of properties to export
     * @throws ExportException if export fails
     */
    public Map<String, Object> export() throws ExportException {
        Map<String, Object> exportMap = new HashMap<>();
        
        try {
            LOG.debug("Exporting ${config.modelName} properties");
            // Add fields to export map
            ${config.fields.filter(f => !f.excludeFromExport).map(f => {
                const jsonProperty = f.jsonProperty ? `@JsonProperty("${f.jsonProperty}")\n    ` : '';
                return `${jsonProperty}exportMap.put("${f.jsonProperty || f.name}", ${f.name});`;
            }).join('\n            ')}
        } catch (Exception e) {
            String errorMsg = "Error exporting ${config.modelName} properties";
            LOG.error(errorMsg, e);
            throw new ExportException(errorMsg, e);
        }
        
        return exportMap;
    }
    
    /**
     * Convenience method to get the exported JSON string
     * @return JSON string representation of the model
     * @throws Exception if serialization fails
     */
    public String toJsonString() throws Exception {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.writeValueAsString(export());
        } catch (Exception e) {
            LOG.error("Error serializing ${config.modelName} to JSON", e);
            throw e;
        }
    }
}`
    },
    'Resource & Request': {
        name: 'Resource & Request Model',
        description: 'Sling Model adaptable from both Resource and SlingHttpServletRequest',
       template: (config) => `${config.includeLicense ? LICENSE_HEADER : ''}
package ${config.packageName};

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.*;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.commons.lang3.StringUtils;
import javax.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.inject.*;

/**
 * Sling Model for ${config.modelName}
 * 
 * Adapts from both Resource and SlingHttpServletRequest
 */
@Model(adaptables = {Resource.class, SlingHttpServletRequest.class},
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class ${config.modelName} {
    
    private static final Logger LOG = LoggerFactory.getLogger(${config.modelName}.class);
    
    @Self
    private SlingHttpServletRequest request;
    
    @Self
    private Resource resource;
    
    @ScriptVariable
    private Page currentPage;
    
    @ScriptVariable
    private PageManager pageManager;
    
    ${config.fields.map(field => generateFieldCode(field)).join('\n\n    ')}
    
    @PostConstruct
    protected void init() {
        try {
            // If adapted from request, get the resource from request
            if (resource == null && request != null) {
                resource = request.getResource();
            }
            
            LOG.debug("Initializing ${config.modelName} with resource: {}", 
                     resource != null ? resource.getPath() : "null");
        } catch (Exception e) {
            LOG.error("Error initializing ${config.modelName}", e);
        }
    }
    
    /**
     * @return the SLF4J logger instance
     */
    protected Logger getLogger() {
        return LOG;
    }
    
    /**
     * @return the request (may be null if adapted from Resource)
     */
    public SlingHttpServletRequest getRequest() {
        return request;
    }
    
    /**
     * @return the resource
     */
    public Resource getResource() {
        return resource;
    }
    
    /**
     * @return the current page (may be null if not in page context)
     */
    public Page getCurrentPage() {
        return currentPage;
    }
    
    /**
     * @return the page manager (may be null if not in request context)
     */
    public PageManager getPageManager() {
        return pageManager;
    }
    
    ${config.fields.map(field => generateGetterSetter(field)).join('\n\n    ')}
}`
    },
    'Dialog Helper': {
        name: 'Dialog Helper Model',
        description: 'Helper model for processing dialog properties and complex components',
       template: (config) => `${config.includeLicense ? LICENSE_HEADER : ''}
package ${config.packageName};

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.*;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.factory.ModelFactory;
import org.apache.commons.lang3.StringUtils;
import javax.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.inject.*;
import java.util.*;
import com.day.cq.wcm.api.Page;
import com.day.cq.wcm.api.PageManager;

/**
 * Dialog Helper Model for ${config.modelName}
 * 
 * Provides helper methods for processing dialog properties and complex components
 */
@Model(adaptables = {SlingHttpServletRequest.class, Resource.class},
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class ${config.modelName} {
    
    private static final Logger LOG = LoggerFactory.getLogger(${config.modelName}.class);
    
    @Self
    private SlingHttpServletRequest request;
    
    @Self
    private Resource resource;
    
    @OSGiService
    private ModelFactory modelFactory;
    
    @ScriptVariable
    private Page currentPage;
    
    @ScriptVariable
    private PageManager pageManager;
    
    // Common dialog properties
    @ValueMapValue(name = "./jcr:title")
    private String title;
    
    @ValueMapValue(name = "./jcr:description")
    private String description;
    
    @ValueMapValue
    private String id;
    
    @ValueMapValue
    private String[] tags;
    
    @ValueMapValue
    private boolean hideInNav;
    
    ${config.fields.map(field => generateFieldCode(field)).join('\n\n    ')}
    
    @PostConstruct
    protected void init() {
        try {
            // If adapted from request, get the resource from request
            if (resource == null && request != null) {
                resource = request.getResource();
            }
            
            LOG.debug("Initializing dialog helper ${config.modelName} for resource: {}", 
                     resource != null ? resource.getPath() : "null");
        } catch (Exception e) {
            LOG.error("Error initializing dialog helper ${config.modelName}", e);
        }
    }
    
    /**
     * @return the SLF4J logger instance
     */
    protected Logger getLogger() {
        return LOG;
    }
    
    /**
     * Get a child resource as a Sling Model
     * @param <T> The model type
     * @param childName The child resource name
     * @param type The model class
     * @return The adapted model or null if not found
     */
    protected <T> T getChildModel(String childName, Class<T> type) {
        if (resource == null) {
            return null;
        }
        Resource child = resource.getChild(childName);
        return child != null ? modelFactory.getModelFromWrappedRequest(request, child, type) : null;
    }
    
    /**
     * Get a list of child resources as Sling Models
     * @param <T> The model type
     * @param childName The child resource name pattern
     * @param type The model class
     * @return List of adapted models (never null)
     */
    protected <T> List<T> getChildModels(String childName, Class<T> type) {
        List<T> models = new ArrayList<>();
        if (resource == null) {
            return models;
        }
        
        for (Resource child : resource.getChildren()) {
            if (child.getName().matches(childName)) {
                T model = modelFactory.getModelFromWrappedRequest(request, child, type);
                if (model != null) {
                    models.add(model);
                }
            }
        }
        return models;
    }
    
    /**
     * Get a dialog property with a default value
     * @param name The property name
     * @param defaultValue The default value
     * @return The property value or default value if not found
     */
    protected <T> T getProperty(String name, T defaultValue) {
        if (resource == null || resource.getValueMap() == null) {
            return defaultValue;
        }
        return resource.getValueMap().get(name, defaultValue);
    }
    
    // Standard getters for common properties
    
    public String getTitle() {
        return title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public String getId() {
        return id != null ? id : "";
    }
    
    public String[] getTags() {
        return tags != null ? tags.clone() : new String[0];
    }
    
    public boolean isHideInNav() {
        return hideInNav;
    }
    
    // Request and resource accessors
    
    public SlingHttpServletRequest getRequest() {
        return request;
    }
    
    public Resource getResource() {
        return resource;
    }
    
    public Page getCurrentPage() {
        return currentPage;
    }
    
    public PageManager getPageManager() {
        return pageManager;
    }
    
    ${config.fields.map(field => generateGetterSetter(field)).join('\n\n    ')}
}`
    }
};

// Helper function to generate field code
function generateFieldCode(field) {
    let annotation = '';
    
    switch(field.injectionType) {
        case 'valueMapValue':
            annotation = `@ValueMapValue(name = "${field.name}"${field.defaultValue ? `, defaultValue = "${field.defaultValue}"` : ''})`;
            break;
        case 'inject':
            annotation = `@Inject${field.optional ? '\n    @Optional' : ''}${field.named ? `\n    @Named("${field.named}")` : ''}`;
            break;
        case 'osgiService':
            annotation = `@OSGiService\n    @Optional`;
            break;
        case 'childResource':
            annotation = `@ChildResource${field.optional ? '\n    @Optional' : ''}${field.injectionStrategy ? `\n    @InjectionStrategy(${field.injectionStrategy})` : ''}`;
            break;
        case 'requestAttribute':
            annotation = `@RequestAttribute(name = "${field.name}"${field.optional ? ', optional = true' : ''})`;
            break;
        case 'scriptVariable':
            annotation = `@ScriptVariable${field.optional ? '\n    @Optional' : ''}${field.name ? `\n    @Named("${field.name}")` : ''}`;
            break;
        case 'postConstruct':
            annotation = `@PostConstruct`;
            break;
        case 'preDestroy':
            annotation = `@PreDestroy`;
            break;
        case 'self':
            annotation = `@Self`;
            break;
        case 'via':
            annotation = `@Via`;
            break;    
    }
    
    return `${annotation}
    private ${field.type} ${field.name};`;
}

// Helper function to generate getter/setter methods
function generateGetterSetter(field) {
    const fieldName = field.name;
    const methodName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const type = field.type;
    
    return `/**
     * @return the ${fieldName}
     */
    public ${type} get${methodName}() {
        return ${fieldName};
    }
    
    /**
     * @param ${fieldName} the ${fieldName} to set
     */
    public void set${methodName}(${type} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`;
}
// Add new command to generate Sling Model
async function generateSlingModel(uri) {
    try {
        const config = new SlingModelConfig();
        
        // Show quick pick for model type
        const modelType = await vscode.window.showQuickPick([
            { label: 'Component Model', description: 'Basic Sling Model for components', value: 'component' },
            { label: 'Request Model', description: 'For request processing', value: 'request' },
            { label: 'Exporter Model', description: 'With Sling Model Exporter', value: 'exporter' },
            { label: 'Resource & Request', description: 'Adaptable from both Resource and Request', value: 'Resource & Request' },
            { label: 'Dialog Helper', description: 'Helper for dialog processing', value: 'Dialog Helper' }
        ], { placeHolder: 'Select Sling Model type' });
        
        if (!modelType) return;
        config.modelType = modelType.value;
        
        // Get package name
        config.packageName = await vscode.window.showInputBox({
            prompt: 'Enter Java package name (e.g., com.example.core.models)',
            placeHolder: 'com.example.core.models',
            validateInput: value => !value || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(value) ? 
                'Please enter a valid Java package name' : null
        });
        
        if (!config.packageName) return;
        
        // Get model name
        config.modelName = await vscode.window.showInputBox({
            prompt: 'Enter model class name (e.g., MyComponentModel)',
            placeHolder: 'MyComponentModel',
            validateInput: value => !value || !/^[A-Z][a-zA-Z0-9]*$/.test(value) ? 
                'Please enter a valid Java class name' : null
        });
        
        if (!config.modelName) return;
        
        // Get resource type if needed
        if (['component', 'exporter', 'Resource & Request'].includes(config.modelType)) {
            config.resourceType = await vscode.window.showInputBox({
                prompt: 'Enter resource type (e.g., myproject/components/content/mycomponent)',
                placeHolder: 'myproject/components/content/mycomponent'
            });
        }
        
        // Configure exporter if needed
        if (config.modelType === 'exporter') {
            config.exporterName = await vscode.window.showInputBox({
                prompt: 'Enter exporter name (e.g., jackson, gson)',
                placeHolder: 'jackson',
                value: 'jackson'
            });
            
            const extensions = await vscode.window.showQuickPick([
                { label: 'JSON', value: 'json' },
                { label: 'XML', value: 'xml' },
                { label: 'HTML', value: 'html' },
                { label: 'TXT', value: 'txt' }
            ], {
                canPickMany: true,
                placeHolder: 'Select export formats'
            });
            
            if (extensions) {
                config.exporterExtensions = extensions.map(e => e.value);
            }
        }
        
        // Add fields
        let addMoreFields = true;
        while (addMoreFields) {
            const fieldName = await vscode.window.showInputBox({
                prompt: 'Enter field name (leave empty to finish)',
                placeHolder: 'myField'
            });
            
            if (!fieldName) {
                addMoreFields = false;
                continue;
            }
            
            const fieldType = await vscode.window.showQuickPick(
                Object.entries(FIELD_TYPES).map(([key, value]) => ({
                    label: value,
                    description: key,
                    value: value
                })),
                { placeHolder: 'Select field type' }
            );
            
            if (!fieldType) continue;
            
            const injectionType = await vscode.window.showQuickPick([
                { label: '@ValueMapValue', value: 'valueMapValue' },
                { label: '@Inject', value: 'inject' },
                { label: '@OSGiService', value: 'osgiService' },
                { label: '@ChildResource', value: 'childResource' },
                { label: '@RequestAttribute', value: 'requestAttribute' },
                { label: '@ScriptVariable', value: 'scriptVariable' },
                { label: '@Self', value: 'self' },
                { label: '@PostConstruct', value: 'postConstruct' },
                { label: '@PreDestroy', value: 'preDestroy' },
                { label: '@Via', value: 'via' }
            ], { placeHolder: 'Select injection type' });
            
            if (!injectionType) continue;
            
            const field = {
                name: fieldName,
                type: fieldType.value,
                injectionType: injectionType.value,
                optional: false,
                named: '',
                defaultValue: '',
                injectionStrategy: null,
                excludeFromExport: false
            };
            
            // Additional configuration based on injection type
            if (['valueMapValue', 'inject', 'childResource', 'scriptVariable'].includes(injectionType.value)) {
                field.optional = await vscode.window.showQuickPick([
                    { label: 'Required', value: false },
                    { label: 'Optional', value: true }
                ], { placeHolder: 'Is this field optional?' }).then(r => r.value);
                
                if (injectionType.value === 'valueMapValue') {
                    field.defaultValue = await vscode.window.showInputBox({
                        prompt: 'Default value (leave empty for none)',
                        placeHolder: 'default value'
                    });
                }
                
                if (injectionType.value === 'inject' || injectionType.value === 'scriptVariable') {
                    field.named = await vscode.window.showInputBox({
                        prompt: 'Named reference (leave empty for default)',
                        placeHolder: 'serviceName'
                    });
                }
                
                if (injectionType.value === 'childResource') {
                    field.injectionStrategy = await vscode.window.showQuickPick([
                        { label: 'DEFAULT', value: 'DEFAULT' },
                        { label: 'REQUIRED', value: 'REQUIRED' },
                        { label: 'OPTIONAL', value: 'OPTIONAL' }
                    ], { placeHolder: 'Select injection strategy' }).then(r => r?.value);
                }
            }
            
            config.fields.push(field);
        }
        
        // Generate the model content
        const template = SLING_MODEL_TEMPLATES[config.modelType] || SLING_MODEL_TEMPLATES.component;
        const content = template.template(config);
        
        // Determine the target directory
        const targetDir = uri && uri.fsPath ? 
            path.join(uri.fsPath, ...config.packageName.split('.')) : 
            path.join(vscode.workspace.rootPath, 'core', 'src', 'main', 'java', ...config.packageName.split('.'));
            
        await fs.ensureDir(targetDir);
        
        // Write the model file
        const filePath = path.join(targetDir, `${config.modelName}.java`);
        await fs.writeFile(filePath, content);
        
        // Open the generated file
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(`✅ Sling Model ${config.modelName} created successfully! 😍`);
        
    } catch (error) {
        vscode.window.showErrorMessage(`🚨Error generating Sling Model: ${error.message}😂`);
        console.error(error);
    }
}

async function getSavePath(uri, defaultFilename, fileType) {
    let targetPath;
    
    if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
        // If a directory is provided, use it as the target path
        targetPath = vscode.Uri.file(path.join(uri.fsPath, defaultFilename));
    } else {
        // Otherwise, show a save dialog
        const options = {
            defaultUri: vscode.Uri.file(defaultFilename),
            filters: {
                [`${fileType} Files`]: [defaultFilename.split('.').pop()],
                'All Files': ['*']
            }
        };
        
        targetPath = await vscode.window.showSaveDialog(options);
        if (!targetPath) return null;
    }
    
    return targetPath;
}

async function openFileInEditor(uri) {
    try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        console.error('Error opening file in editor:', error);
    }
}

///new
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~ Copyright 2025 Padde Soft
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

class HTLCompletionProvider {
    provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        
        if (!linePrefix.includes('data-sly-') && !linePrefix.includes('sly-')) {
            return undefined;
        }
 
        return Object.values(CONFIG.HTL.SNIPPETS).map(snippet => {
            const completion = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
            completion.insertText = new vscode.SnippetString(snippet.body.join('\n'));
            completion.documentation = new vscode.MarkdownString(snippet.description);
            return completion;
        });
    }
}

async function generateGraphQLModel(uri) {
    try {
        const config = new GraphQLModelConfig();
        
        config.modelName = await validatedInput(
            'Enter GraphQL query name (e.g., GetProduct, GetPage)',
            /^[A-Z][a-zA-Z0-9]*$/,
            'Query name must start with an uppercase letter and contain only alphanumeric characters'
        );
        if (!config.modelName) return;

        const template = generateGraphQLTemplate(config);
        
        const targetPath = await getSavePath(uri, `${config.modelName}.graphql`, 'GraphQL');
        if (!targetPath) return;

        await fs.outputFile(targetPath.fsPath, template);
        await openFileInEditor(targetPath);
        
        vscode.window.showInformationMessage(`GraphQL Query '${config.modelName}' created successfully!`);

    } catch (error) {
        showErrorMessage('Error generating GraphQL model', error);
    }
}

function generateGraphQLTemplate(config) {
    // Default fields if none provided
    const defaultFields = [
        { name: 'id', type: 'ID!', description: 'Unique identifier' },
        { name: 'title', type: 'String', description: 'The title of the item' },
        { name: 'description', type: 'String', description: 'A detailed description' },
        { name: 'created', type: 'String', description: 'Creation timestamp' }
    ];

    // Use provided fields or default ones
    const fields = (config.fields && config.fields.length > 0 ? config.fields : defaultFields)
        .map(field => {
            const type = field.type || 'String';
            const required = field.required ? '!' : '';
            const description = field.description ? ` # ${field.description}` : '';
            return `    ${field.name}: ${type}${required}${description}`;
        })
        .join('\n');

    // Generate example query based on the model name
    const queryName = config.modelName.charAt(0).toLowerCase() + config.modelName.slice(1);
    const exampleQuery = `query ${config.modelName}Query($id: ID!) {
  ${queryName}(id: $id) {
    id
    # Add more fields as needed
  }
}`;

    return `# ${config.modelName} Query
# Generated by AEM Development Tools
# ${new Date().toISOString()}

type ${config.modelName} {
${fields}
}

# Example query:
${exampleQuery}

# Example variables:
# {
#   "id": "item-123"
# }`;
}

async function validatedInput(prompt, regex, errorMsg) {
    return await vscode.window.showInputBox({
        prompt,
        validateInput: value => !value || !regex.test(value) 
            ? (errorMsg || `Invalid input. Must match: ${regex}`)
            : null
    });
}

async function selectModelType() {
    const selection = await vscode.window.showQuickPick([
        { label: 'Component Model', value: 'component' },
        { label: 'Request Model', value: 'request' },
        { label: 'Exporter Model', value: 'exporter' },
        { label: 'Resource & Request', value: 'Resource & Request' },
        { label: 'Dialog Helper', value: 'Dialog Helper' }
    ], { placeHolder: 'Select Sling Model type' });
    
    return selection?.value;
}

async function configureResourceType(config) {
    if (['component', 'exporter', 'Resource & Request'].includes(config.modelType)) {
        config.resourceType = await validatedInput(
            'Enter resource type',
            /^[a-z-]+\/components\/.+/,
            'Must follow "project/components/..." pattern'
        );
    }
}

async function configureExporter(config) {
    if (config.modelType === 'exporter') {
        config.exporterName = await validatedInput(
            'Enter exporter name',
            /^[a-zA-Z]+$/,
            'Only letters allowed',
            'jackson'
        );
        
        const extensions = await vscode.window.showQuickPick(
            Object.entries(CONFIG.EXPORTER_FORMATS).map(([value, label]) => ({ label, value })),
            { canPickMany: true, placeHolder: 'Select export formats' }
        );
        
        if (extensions) {
            config.exporterExtensions = extensions.map(e => e.value);
        }
    }
}

function showErrorMessage(context, error) {
    vscode.window.showErrorMessage(`${context}: ${error.message}`);
    console.error(`${context}:`, error);
}

function activate(context) {
    console.log('AEM Development Tools extension activated');

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'html' },
            new HTLCompletionProvider(),
            ' '
        ),
        vscode.commands.registerCommand('extension.generateSlingModel', generateSlingModel),
        vscode.commands.registerCommand('extension.generateGraphQLModel', generateGraphQLModel)
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};