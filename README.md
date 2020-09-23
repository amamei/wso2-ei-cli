# WSO2 Carbon App Buillder

Using:
``` bash
npm install -g wso2-ei-cli
integrator build -t <project_name> [-e <environment_name>] [-o <output_path>]
integrator new -t <project_name>
```

Project structure
```
.
|--+ _common
|  |--+ synapse-config
|  |  |-- api
|  |  |-- endpoints
|  |  |-- proxy-services
|  |  |-- sequences
|  |  |-- templates
|  |
|  |--+ registry
|     |-- endpoints
|     |-- policies
|     |-- scripts
|     |-- swaggers
|     |-- wsdls
|     |-- xslts
|
|--+ project-name
   |--+ synapse-config
   |  |-- api
   |  |-- endpoints
   |  |-- proxy-services
   |  |-- sequences
   |  |-- templates
   |
   |--+ registry
      |-- endpoints
      |-- policies
      |-- scripts
      |-- swaggers
      |-- wsdls
      |-- xslts
```

## Changelog

### 1.1.1
* Set swagger mediaType depends of file extension

### 1.1.0
* Add environment dependency

  Project should contain env.json file with variables

  Usage example:

  __{$ProjectHome}/registry/endpoints/GetTime.xml__
  ``` xml
  <endpoint name="GetTime" xmlns="http://ws.apache.org/ns/synapse">
      <http method="GET" uri-template="{{__endpoint_worldtime_host__}}/api/timezone/{{__timezone__}}" />
  </endpoint>
  ```

  __env.json__
  ``` json
  {
      "endpoint_worldtime_host": "http://worldtimeapi.org",
      "timezone": "Europe/London"
  }
  ```

### 1.0.4
* Add swagger registry file type

  __Result__
  ``` xml
  <endpoint name="GetTime" xmlns="http://ws.apache.org/ns/synapse">
      <http method="GET" uri-template="http://worldtimeapi.org/api/timezone/Europe/London" />
  </endpoint>
  ```

### 1.0.3
* Added support for dataservices

### 1.0.2
* Added posibility to set output CAR name
* Added more command actions

### 1.0.1
* Fixed usage example

### 1.0.0
* Create project
* Build carbon application
