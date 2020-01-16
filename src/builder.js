const fs = require("fs");
const path = require("path");
import rimraf from "rimraf";
import archiver from "archiver";
import helper from "./helper";

class Builder {

	constructor() {
		this.XmlHeaderTemplate = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
		this.SynapseArtifactTemplate = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><artifact name=\"${artifact}\" version=\"${version}\" type=\"${media-type}\" serverRole=\"EnterpriseServiceBus\"><file>${artifact}.xml</file></artifact>";
		this.RegistryArtifactTemplate = "<artifact name=\"${artifact}\" version=\"${version}\" type=\"registry/resource\" serverRole=\"EnterpriseServiceBus\"><file>registry-info.xml</file></artifact>";
		this.RegistryInfoTemplate = "<resources><item><file>${artifact}${extension}</file><path>/_system/governance/${type}</path><mediaType>${mediaType}</mediaType></item></resources>";
		this.MetaTypes = {
			"synapse-config": {
				templates: "synapse/template",
				endpoints: "synapse/endpoint",
				sequences: "synapse/sequence",
				api: "synapse/api",
				"proxy-services": "synapse/proxy-service"
			},
			registry: {
				wsdls: "application/wsdl+xml",
				endpoints: "application/vnd.wso2.esb.endpoint",
				policies: "application/wspolicy+xml",
				xslts: "application/xslt+xml",
				scripts: "application/javascript"
			}
		}
		this.version = "1.0.0";
	}

	Create(_root, project) {
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

		helper.EnsureFolderExists(path.join(this.outputTemp, artifact));
		helper.EnsureFolderExists(path.join(this.outputTemp, artifact, "resources"));

		fs.createReadStream(file).pipe(fs.createWriteStream(path.join(this.outputTemp, artifact, "resources", artifactName + extension)));

		var content = this.XmlHeaderTemplate + this.RegistryArtifactTemplate
			.replace(/\$\{artifact\}/g, artifactName)
			.replace(/\$\{version\}/g, this.version);
		fs.writeFile(path.join(this.outputTemp, artifact, "artifact.xml"), content, (err) => {
			if (err) {
				console.log(err);
				throw err;
			}
		});

		content = this.XmlHeaderTemplate + this.RegistryInfoTemplate
			.replace(/\$\{artifact\}/g, artifactName)
			.replace(/\$\{version\}/g, this.version)
			.replace(/\$\{type\}/g, type)
			.replace(/\$\{extension\}/g, extension)
			.replace(/\$\{mediaType\}/g, this.MetaTypes.registry[type]);
		fs.writeFile(path.join(this.outputTemp, artifact, "registry-info.xml"), content, (err) => {
			if (err) {
				console.log(err);
				throw err;
			}
		});
	}

	BuildSynapseArtifact(file, type) {
		var extension = path.extname(file);
		var artifactName = path.basename(file, extension);
		var artifact = artifactName + "_" + this.version;

		helper.EnsureFolderExists(path.join(this.outputTemp, artifact));

		fs.createReadStream(file).pipe(fs.createWriteStream(path.join(this.outputTemp, artifact, artifactName + extension)));

		var content = this.SynapseArtifactTemplate
			.replace(/\$\{artifact\}/g, artifactName)
			.replace(/\$\{version\}/g, this.version)
			.replace(/\$\{media\-type\}/g, this.MetaTypes["synapse-config"][type]);
		fs.writeFile(path.join(this.outputTemp, artifact, "artifact.xml"), content, (err) => {
			if (err) {
				console.log(err);
				throw err;
			}
		});
	}

	BuildCommonRegistryConfigs() {
		for (var type in this.MetaTypes.registry) {
			if (!fs.existsSync(path.join(this.root, "_common", "registry", type))) {
				continue;
			}
			if (type === "Profile.xml") {
				continue;
			}
			fs.readdirSync(path.join(this.root, "_common", "registry", type))
				.forEach(file => {
					var extension = path.extname(file);
					if (!extension ||
						extension.length === 0 ||
						fs.existsSync(path.join(this.root, this.tenant, "registry", type, this.env, file))
					) { return; }
					var fileName = path.basename(file, extension);
					this.BuildArtifactsAddDependency(fileName);
					this.BuildRegistryArtifact(path.join(this.root, "_common", "registry", type, path.basename(file)), type);
				});
		}
	}

	BuildCommonSynapseConfigs() {
		for (var type in this.MetaTypes["synapse-config"]) {
			if (!fs.existsSync(path.join(this.root, "_common", "synapse-config", type))) {
				continue;
			}
			fs.readdirSync(path.join(this.root, "_common", "synapse-config", type))
				.forEach(file => {
					var extension = path.extname(file);
					if (!extension ||
						extension.length === 0 ||
						fs.existsSync(path.join(this.root, this.tenant, "synapse-config", type, this.env, file))
					) return;
					var fileName = path.basename(file, extension);
					this.BuildArtifactsAddDependency(fileName);
					this.BuildSynapseArtifact(path.join(this.root, "_common", "synapse-config", type, path.basename(file)), type);
				});
		}
	}

	BuildRegistryConfigs() {
		for (var type in this.MetaTypes.registry) {
			if (!fs.existsSync(path.join(this.root, this.tenant, "registry", type))) continue;
			fs.readdirSync(path.join(this.root, this.tenant, "registry", type))
				.forEach(file => {
					var extension = path.extname(file);
					if (!extension || extension.length === 0 ||
						fs.existsSync(path.join(this.root, this.tenant, "registry", type, this.env, file))
					) return;
					var fileName = path.basename(file, extension);
					this.BuildArtifactsAddDependency(fileName);
					this.BuildRegistryArtifact(path.join(this.root, this.tenant, "registry", type, path.basename(file)), type);
				});
			if (fs.existsSync(path.join(this.root, this.tenant, "registry", type, this.env))) {
				fs.readdirSync(path.join(this.root, this.tenant, "registry", type, this.env))
					.forEach(file => {
						var extension = path.extname(file);
						this.BuildArtifactsAddDependency(path.basename(file, extension));
						this.BuildRegistryArtifact(path.join(this.root, this.tenant, "registry", type, this.env, path.basename(file)), type);
					});
			}
		}
	}

	BuildSynapseConfigs() {
		for (var type in this.MetaTypes["synapse-config"]) {
			if (!fs.existsSync(path.join(this.root, this.tenant, "synapse-config", type))) {
				continue;
			}
			fs.readdirSync(path.join(this.root, this.tenant, "synapse-config", type))
				.forEach(file => {
					var extension = path.extname(file);
					if (!extension || extension.length === 0 ||
						fs.existsSync(path.join(this.root, this.tenant, "synapse-config", type, this.env, file))
					)
						return;
					var fileName = path.basename(file, extension);
					this.BuildArtifactsAddDependency(fileName);
					this.BuildSynapseArtifact(path.join(this.root, this.tenant, "synapse-config", type, path.basename(file)), type);
				});
			if (fs.existsSync(path.join(this.root, this.tenant, "synapse-config", type, this.env))) {
				fs.readdirSync(path.join(this.root, this.tenant, "synapse-config", type, this.env))
					.forEach(file => {
						var extension = path.extname(file);
						var fileName = path.basename(file, extension);
						this.BuildArtifactsAddDependency(fileName);
						this.BuildSynapseArtifact(path.join(this.root, this.tenant, "synapse-config", type, this.env, path.basename(file)), type);
					});
			}
		}
	}

	BuildArtifactsAddDependency(artifact) {
		fs.appendFileSync(
			path.join(this.outputTemp, "artifacts.xml"),
			`<dependency artifact="${artifact}" version="${this.version}" include="true" serverRole="EnterpriseServiceBus"/>`
		);
	}

	BuildArtifactsStart() {
		fs.appendFileSync(
			path.join(this.outputTemp, "artifacts.xml"),
			'<?xml version="1.0" encoding="UTF-8"?><artifacts><artifact name="${tenant}" version="${version}" type="carbon/application">'
				.replace("${tenant}", this.tenant)
				.replace("${version}", this.version)
		);
	}

	BuildArtifactsEnd() {
		fs.appendFileSync(path.join(this.outputTemp, "artifacts.xml"), "</artifact></artifacts>");
	}

	BuildCApp() {
		if (!this.outputCarName) this.outputCarName = `${this.env}-${this.tenant}_${this.version}.car`;
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
		rimraf(path.join(this.output, `${this.env}-${this.tenant}_${this.version}.car`), () => {
			helper.EnsureFolderExists(this.output);
			helper.EnsureFolderExists(this.outputTemp);
			this.BuildArtifactsStart();
			this.BuildCommonRegistryConfigs();
			this.BuildCommonSynapseConfigs();
			this.BuildRegistryConfigs();
			this.BuildSynapseConfigs();
			this.BuildArtifactsEnd();
			this.BuildCApp();
		});
	}
}

export default new Builder();