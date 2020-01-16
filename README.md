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
      |-- wsdls
      |-- xslts
```

## Changelog

### 1.0.0
* Create project
* Build carbon application

### 1.0.1
* Fixed usage example

### 1.0.2
* Added posibility to set output CAR name
* Added more command actions