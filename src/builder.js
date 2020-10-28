import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import archiver from "archiver";
import helper from "./helper";

class Builder {
    constructor() {
        this.XmlHeaderTemplate = '<?xml version="1.0" encoding="UTF-8"?>';
        this.SynapseArtifactTemplate = '<?xml version="1.0" encoding="UTF-8"?><artifact name="${artifact}" version="${version}" type="${media-type}" serverRole="${serverRole}"><file>${artifact}${extension}</file></artifact>';
        this.RegistryArtifactTemplate = '<artifact name="${artifact}" version="${version}" type="registry/resource" serverRole="${serverRole}"><file>registry-info.xml</file></artifact>';
        this.RegistryInfoTemplate = '<resources><item><file>${artifact}${extension}</file><path>/_system/governance/${type}</path><mediaType>${mediaType}</mediaType></item></resources>';
        this.MetaTypes = {
            'synapse-config': {
                templates: 'synapse/template',
                sequences: 'synapse/sequence',
                api: 'synapse/api',
                'proxy-services': 'synapse/proxy-service',
                dataservice: 'service/dataservice',
            },
            registry: {
                wsdls: 'application/wsdl+xml',
                swaggers: {
                    "json": "application/json",
                    "yaml": "application/yaml"
                },
                endpoints: 'application/vnd.wso2.esb.endpoint',
                policies: 'application/wspolicy+xml',
                xslts: 'application/xslt+xml',
                scripts: 'application/javascript',
            },
        };
        this.ServerRoles = {
            dataservice: "DataServicesServer",
            default: "EnterpriseServiceBus"
        }
        this.version = '1.0.0';
        this.root = null;
        this.env = null;
        this.tenant = null;
    }

    CreateProject(_root, project) {
        helper.EnsureFolderExists(path.join(_root, project));
        for (let metaType of Object.keys(this.MetaTypes)) {
            helper.EnsureFolderExists(path.join(_root, project, metaType));
            for (let type of Object.keys(this.MetaTypes[metaType])) {
                helper.EnsureFolderExists(path.join(_root, project, metaType, type));
            }
        }
    }

    BuildRegistryArtifact(file, type) {
        var extension = path.extname(file);
        var artifactName = path.basename(file, extension);
        var artifact = artifactName + "_" + this.version;

        var serverRole = this.ServerRoles.default;
        if(type && this.ServerRoles[type]) serverRole = this.ServerRoles[type];

        helper.EnsureFolderExists(path.join(this.outputTemp, artifact));
        helper.EnsureFolderExists(path.join(this.outputTemp, artifact, "resources"));

        let fileContent = fs.readFileSync(file, 'utf8');
        const envVarFilePath = path.join(this.root, this.tenant, `env${this.env ? '.' + this.env : ''}.json`);
        if (fs.existsSync(envVarFilePath)) {
            let templates = [...new Set(fileContent.match(/\{\{__[\w\.]+__\}\}/g))];
            const envVars = JSON.parse(fs.readFileSync(envVarFilePath, 'utf8'));
            templates.forEach(template => {
                const varName = template.substring(4, template.length - 4);
                fileContent = fileContent
                    .replace(new RegExp(template, 'g'), envVars[varName] || '');
            });
        }
        fs.writeFileSync(path.join(this.outputTemp, artifact, "resources", artifactName + extension), fileContent);

        var content = this.XmlHeaderTemplate +
            this.RegistryArtifactTemplate
                .replace(/\$\{artifact\}/g, artifactName)
                .replace(/\$\{serverRole\}/g, serverRole)
                .replace(/\$\{version\}/g, this.version);
        fs.writeFile(path.join(this.outputTemp, artifact, "artifact.xml"), content, (err) => {
            if (err) {
                console.log(err);
                throw err;
            }
        });

        let mediaType = this.MetaTypes.registry[type];

        if (this.MetaTypes.registry[type][extension.substring(1)]) {
            mediaType = this.MetaTypes.registry[type][extension.substring(1)];
        }

        content = this.XmlHeaderTemplate +
            this.RegistryInfoTemplate.replace(/\$\{artifact\}/g, artifactName)
                .replace(/\$\{version\}/g, this.version)
                .replace(/\$\{type\}/g, type)
                .replace(/\$\{extension\}/g, extension)
                .replace(/\$\{mediaType\}/g, mediaType);
        fs.writeFile(path.join(this.outputTemp, artifact, "registry-info.xml"), content, (err) => {
            if (err) {
                console.log(err);
                throw err;
            }
        }
        );
    }

    BuildSynapseArtifact(file, type) {
        var extension = path.extname(file);
        var artifactName = path.basename(file, extension);
        var artifact = artifactName + "_" + this.version;

        var serverRole = this.ServerRoles.default;
        if(type && this.ServerRoles[type]) serverRole = this.ServerRoles[type];

        helper.EnsureFolderExists(path.join(this.outputTemp, artifact));

        let fileContent = fs.readFileSync(file, 'utf8');
        let templates = [...new Set(fileContent.match(/\{\{__[\w\.]+__\}\}/g))];
        const envVarFilePath = path.join(this.root, this.tenant, `env${this.env ? '.' + this.env : ''}.json`);
        if (fs.existsSync(envVarFilePath)) {
            const envVars = JSON.parse(fs.readFileSync(envVarFilePath, 'utf8'));
            templates.forEach(template => {
                const varName = template.substring(4, template.length - 4);
                fileContent = fileContent
                    .replace(new RegExp(template, 'g'), envVars[varName] || '');
            });
        }
        fs.writeFileSync(path.join(this.outputTemp, artifact, artifactName + extension), fileContent);

        var content = this.SynapseArtifactTemplate
            .replace(/\$\{artifact\}/g, artifactName)
            .replace(/\$\{version\}/g, this.version)
            .replace(/\$\{serverRole\}/g, serverRole)
            .replace(/\$\{extension\}/g, extension)
            .replace(/\$\{media\-type\}/g, this.MetaTypes["synapse-config"][type]);
        fs.writeFile(path.join(this.outputTemp, artifact, "artifact.xml"), content, (err) => {
            if (err) {
                console.log(err);
                throw err;
            }
        });
    }

    BuildRegistryConfigs(projectName) {
        for (var type in this.MetaTypes.registry) {
            if (!fs.existsSync(path.join(this.root, projectName, "registry", type)))
                continue;
            fs.readdirSync(path.join(this.root, projectName, "registry", type))
                .forEach((file) => {
                    var extension = path.extname(file);
                    if (!extension || extension.length === 0 || fs.existsSync(path.join(this.root, projectName, "registry", type, this.env, file)))
                        return;
                    var fileName = path.basename(file, extension);
                    this.BuildArtifactsAddDependency(fileName);
                    this.BuildRegistryArtifact(path.join(this.root, projectName, "registry", type, path.basename(file)), type);
                });
            if (fs.existsSync(path.join(this.root, projectName, "registry", type, this.env))) {
                fs.readdirSync(path.join(this.root, projectName, "registry", type, this.env))
                    .forEach((file) => {
                        var extension = path.extname(file);
                        this.BuildArtifactsAddDependency(path.basename(file, extension));
                        this.BuildRegistryArtifact(path.join(this.root, projectName, "registry", type, this.env, path.basename(file)), type);
                    });
            }
        }
    }

    BuildSynapseConfigs(projectName) {
        for (var type in this.MetaTypes["synapse-config"]) {
            if (!fs.existsSync(path.join(this.root, projectName, "synapse-config", type))) {
                continue;
            }
            fs.readdirSync(path.join(this.root, projectName, "synapse-config", type))
                .forEach((file) => {
                    var extension = path.extname(file);
                    if (!extension || extension.length === 0 || fs.existsSync(path.join(this.root, projectName, "synapse-config", type, this.env, file)))
                        return;
                    var fileName = path.basename(file, extension);
                    this.BuildArtifactsAddDependency(fileName, type);
                    this.BuildSynapseArtifact(path.join(this.root, projectName, "synapse-config", type, path.basename(file)), type);
                });
            if (fs.existsSync(path.join(this.root, projectName, "synapse-config", type, this.env))) {
                fs.readdirSync(path.join(this.root, projectName, "synapse-config", type, this.env))
                    .forEach((file) => {
                        var extension = path.extname(file);
                        var fileName = path.basename(file, extension);
                        this.BuildArtifactsAddDependency(fileName);
                        this.BuildSynapseArtifact(path.join(this.root, projectName, "synapse-config", type, this.env, path.basename(file)), type);
                    });
            }
        }
    }

    BuildArtifactsStart() {
        fs.appendFileSync(path.join(this.outputTemp, "artifacts.xml"),
            `<?xml version="1.0" encoding="UTF-8"?><artifacts><artifact name="${this.tenant}" version="${this.version}" type="carbon/application">`
        );
    }

    BuildArtifactsAddDependency(artifact, type) {
        var serverRole = this.ServerRoles.default;
        if(type && this.ServerRoles[type]) serverRole = this.ServerRoles[type];
        fs.appendFileSync(
            path.join(this.outputTemp, "artifacts.xml"),
            `<dependency artifact="${artifact}" version="${this.version}" include="true" serverRole="${serverRole}"/>`
        );
    }

    BuildArtifactsEnd() {
        fs.appendFileSync(path.join(this.outputTemp, "artifacts.xml"), "</artifact></artifacts>");
    }

    BuildCApp() {
        if (!this.outputCarName)
            this.outputCarName = `${this.env}-${this.tenant}_${this.version}.car`;
        var outputZip = fs.createWriteStream(path.join(this.output, this.outputCarName));
        var zipArchive = archiver("zip");
        outputZip.on("close", () => { rimraf(this.outputTemp, () => { }); });
        zipArchive.pipe(outputZip);
        zipArchive.directory(this.outputTemp, false);
        zipArchive.finalize(function (err) {
            if (err) {
                console.log(err);
                throw err;
            }
        });
    }

    Build(rootPath, tenant, env, output) {
        this.root = rootPath;
        this.env = env;
        this.tenant = tenant;
        if (!fs.existsSync(path.join(this.root, this.tenant))) {
            console.log(`Project ${this.tenant} not found.`);
            process.exit(1);
        }
        if (output) {
            let extention = path.extname(output);
            if (extention === ".car") {
                this.outputCarName = path.basename(output);
                output = path.dirname(output);
                if (output == ".") output = "output";
            }
            if (path.isAbsolute(output)) {
                this.output = output;
            } else {
                this.output = path.join(this.root, output);
            }
        } else {
            this.output = path.join(this.root, "output");
        }
        this.outputTemp = path.join(this.output, `${this.tenant}_${this.version}`);

        console.log(`Tenant: ${this.tenant}_${this.version}`);
        console.log(`Output: ${this.output}`);
        console.log(`Output CAR name: ${this.outputCarName}`);
        helper.EnsureFolderExists(this.output);
        rimraf(path.join(this.output, `${this.env}-${this.tenant}_${this.version}.car`),
            () => {
                helper.EnsureFolderExists(this.output);
                helper.EnsureFolderExists(this.outputTemp);
                this.BuildArtifactsStart();
                this.BuildRegistryConfigs('_common');
                this.BuildSynapseConfigs('_common');
                this.BuildRegistryConfigs(this.tenant);
                this.BuildSynapseConfigs(this.tenant);
                this.BuildArtifactsEnd();
                this.BuildCApp();
            }
        );
    }
}

export default new Builder();
