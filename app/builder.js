"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _rimraf = _interopRequireDefault(require("rimraf"));

var _archiver = _interopRequireDefault(require("archiver"));

var _helper = _interopRequireDefault(require("./helper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var fs = require("fs");

var path = require("path");

var Builder =
/*#__PURE__*/
function () {
  function Builder() {
    _classCallCheck(this, Builder);

    this.XmlHeaderTemplate = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    this.SynapseArtifactTemplate = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><artifact name=\"${artifact}\" version=\"${version}\" type=\"${media-type}\" serverRole=\"EnterpriseServiceBus\"><file>${artifact}.xml</file></artifact>";
    this.RegistryArtifactTemplate = "<artifact name=\"${artifact}\" version=\"${version}\" type=\"registry/resource\" serverRole=\"EnterpriseServiceBus\"><file>registry-info.xml</file></artifact>";
    this.RegistryInfoTemplate = "<resources><item><file>${artifact}${extension}</file><path>/_system/governance/${type}</path><mediaType>${mediaType}</mediaType></item></resources>";
    this.MetaTypes = {
      "synapse-config": {
        templates: "synapse/template",
        sequences: "synapse/sequence",
        api: "synapse/api",
        "proxy-services": "synapse/proxy-service",
        dataservice: "service/dataservice"
      },
      registry: {
        wsdls: "application/wsdl+xml",
        endpoints: "application/vnd.wso2.esb.endpoint",
        policies: "application/wspolicy+xml",
        xslts: "application/xslt+xml",
        scripts: "application/javascript"
      }
    };
    this.version = "1.0.0";
  }

  _createClass(Builder, [{
    key: "Create",
    value: function Create(_root, project) {
      _helper["default"].EnsureFolderExists(path.join(_root, project));

      for (var _i = 0, _Object$keys = Object.keys(this.MetaTypes); _i < _Object$keys.length; _i++) {
        var metaType = _Object$keys[_i];

        _helper["default"].EnsureFolderExists(path.join(_root, project, metaType));

        for (var _i2 = 0, _Object$keys2 = Object.keys(this.MetaTypes[metaType]); _i2 < _Object$keys2.length; _i2++) {
          var type = _Object$keys2[_i2];

          _helper["default"].EnsureFolderExists(path.join(_root, project, metaType, type));
        }
      }
    }
  }, {
    key: "BuildRegistryArtifact",
    value: function BuildRegistryArtifact(file, type) {
      var extension = path.extname(file);
      var artifactName = path.basename(file, extension);
      var artifact = artifactName + "_" + this.version;

      _helper["default"].EnsureFolderExists(path.join(this.outputTemp, artifact));

      _helper["default"].EnsureFolderExists(path.join(this.outputTemp, artifact, "resources"));

      fs.createReadStream(file).pipe(fs.createWriteStream(path.join(this.outputTemp, artifact, "resources", artifactName + extension)));
      var content = this.XmlHeaderTemplate + this.RegistryArtifactTemplate.replace(/\$\{artifact\}/g, artifactName).replace(/\$\{version\}/g, this.version);
      fs.writeFile(path.join(this.outputTemp, artifact, "artifact.xml"), content, function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });
      content = this.XmlHeaderTemplate + this.RegistryInfoTemplate.replace(/\$\{artifact\}/g, artifactName).replace(/\$\{version\}/g, this.version).replace(/\$\{type\}/g, type).replace(/\$\{extension\}/g, extension).replace(/\$\{mediaType\}/g, this.MetaTypes.registry[type]);
      fs.writeFile(path.join(this.outputTemp, artifact, "registry-info.xml"), content, function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });
    }
  }, {
    key: "BuildSynapseArtifact",
    value: function BuildSynapseArtifact(file, type) {
      var extension = path.extname(file);
      var artifactName = path.basename(file, extension);
      var artifact = artifactName + "_" + this.version;

      _helper["default"].EnsureFolderExists(path.join(this.outputTemp, artifact));

      fs.createReadStream(file).pipe(fs.createWriteStream(path.join(this.outputTemp, artifact, artifactName + extension)));
      var content = this.SynapseArtifactTemplate.replace(/\$\{artifact\}/g, artifactName).replace(/\$\{version\}/g, this.version).replace(/\$\{media\-type\}/g, this.MetaTypes["synapse-config"][type]);
      fs.writeFile(path.join(this.outputTemp, artifact, "artifact.xml"), content, function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });
    }
  }, {
    key: "BuildCommonRegistryConfigs",
    value: function BuildCommonRegistryConfigs() {
      var _this = this;

      for (var type in this.MetaTypes.registry) {
        if (!fs.existsSync(path.join(this.root, "_common", "registry", type))) {
          continue;
        }

        if (type === "Profile.xml") {
          continue;
        }

        fs.readdirSync(path.join(this.root, "_common", "registry", type)).forEach(function (file) {
          var extension = path.extname(file);

          if (!extension || extension.length === 0 || fs.existsSync(path.join(_this.root, _this.tenant, "registry", type, _this.env, file))) {
            return;
          }

          var fileName = path.basename(file, extension);

          _this.BuildArtifactsAddDependency(fileName);

          _this.BuildRegistryArtifact(path.join(_this.root, "_common", "registry", type, path.basename(file)), type);
        });
      }
    }
  }, {
    key: "BuildCommonSynapseConfigs",
    value: function BuildCommonSynapseConfigs() {
      var _this2 = this;

      for (var type in this.MetaTypes["synapse-config"]) {
        if (!fs.existsSync(path.join(this.root, "_common", "synapse-config", type))) {
          continue;
        }

        fs.readdirSync(path.join(this.root, "_common", "synapse-config", type)).forEach(function (file) {
          var extension = path.extname(file);
          if (!extension || extension.length === 0 || fs.existsSync(path.join(_this2.root, _this2.tenant, "synapse-config", type, _this2.env, file))) return;
          var fileName = path.basename(file, extension);

          _this2.BuildArtifactsAddDependency(fileName);

          _this2.BuildSynapseArtifact(path.join(_this2.root, "_common", "synapse-config", type, path.basename(file)), type);
        });
      }
    }
  }, {
    key: "BuildRegistryConfigs",
    value: function BuildRegistryConfigs() {
      var _this3 = this;

      for (var type in this.MetaTypes.registry) {
        if (!fs.existsSync(path.join(this.root, this.tenant, "registry", type))) continue;
        fs.readdirSync(path.join(this.root, this.tenant, "registry", type)).forEach(function (file) {
          var extension = path.extname(file);
          if (!extension || extension.length === 0 || fs.existsSync(path.join(_this3.root, _this3.tenant, "registry", type, _this3.env, file))) return;
          var fileName = path.basename(file, extension);

          _this3.BuildArtifactsAddDependency(fileName);

          _this3.BuildRegistryArtifact(path.join(_this3.root, _this3.tenant, "registry", type, path.basename(file)), type);
        });

        if (fs.existsSync(path.join(this.root, this.tenant, "registry", type, this.env))) {
          fs.readdirSync(path.join(this.root, this.tenant, "registry", type, this.env)).forEach(function (file) {
            var extension = path.extname(file);

            _this3.BuildArtifactsAddDependency(path.basename(file, extension));

            _this3.BuildRegistryArtifact(path.join(_this3.root, _this3.tenant, "registry", type, _this3.env, path.basename(file)), type);
          });
        }
      }
    }
  }, {
    key: "BuildSynapseConfigs",
    value: function BuildSynapseConfigs() {
      var _this4 = this;

      for (var type in this.MetaTypes["synapse-config"]) {
        if (!fs.existsSync(path.join(this.root, this.tenant, "synapse-config", type))) {
          continue;
        }

        fs.readdirSync(path.join(this.root, this.tenant, "synapse-config", type)).forEach(function (file) {
          var extension = path.extname(file);
          if (!extension || extension.length === 0 || fs.existsSync(path.join(_this4.root, _this4.tenant, "synapse-config", type, _this4.env, file))) return;
          var fileName = path.basename(file, extension);

          _this4.BuildArtifactsAddDependency(fileName);

          _this4.BuildSynapseArtifact(path.join(_this4.root, _this4.tenant, "synapse-config", type, path.basename(file)), type);
        });

        if (fs.existsSync(path.join(this.root, this.tenant, "synapse-config", type, this.env))) {
          fs.readdirSync(path.join(this.root, this.tenant, "synapse-config", type, this.env)).forEach(function (file) {
            var extension = path.extname(file);
            var fileName = path.basename(file, extension);

            _this4.BuildArtifactsAddDependency(fileName);

            _this4.BuildSynapseArtifact(path.join(_this4.root, _this4.tenant, "synapse-config", type, _this4.env, path.basename(file)), type);
          });
        }
      }
    }
  }, {
    key: "BuildArtifactsAddDependency",
    value: function BuildArtifactsAddDependency(artifact) {
      fs.appendFileSync(path.join(this.outputTemp, "artifacts.xml"), "<dependency artifact=\"".concat(artifact, "\" version=\"").concat(this.version, "\" include=\"true\" serverRole=\"EnterpriseServiceBus\"/>"));
    }
  }, {
    key: "BuildArtifactsStart",
    value: function BuildArtifactsStart() {
      fs.appendFileSync(path.join(this.outputTemp, "artifacts.xml"), '<?xml version="1.0" encoding="UTF-8"?><artifacts><artifact name="${tenant}" version="${version}" type="carbon/application">'.replace("${tenant}", this.tenant).replace("${version}", this.version));
    }
  }, {
    key: "BuildArtifactsEnd",
    value: function BuildArtifactsEnd() {
      fs.appendFileSync(path.join(this.outputTemp, "artifacts.xml"), "</artifact></artifacts>");
    }
  }, {
    key: "BuildCApp",
    value: function BuildCApp() {
      var _this5 = this;

      if (!this.outputCarName) this.outputCarName = "".concat(this.env, "-").concat(this.tenant, "_").concat(this.version, ".car");
      var outputZip = fs.createWriteStream(path.join(this.output, this.outputCarName));
      var zipArchive = (0, _archiver["default"])("zip");
      outputZip.on("close", function () {
        (0, _rimraf["default"])(_this5.outputTemp, function () {});
      });
      zipArchive.pipe(outputZip);
      zipArchive.directory(this.outputTemp, false);
      zipArchive.finalize(function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });
    }
  }, {
    key: "Build",
    value: function Build(rootPath, tenant, env, output) {
      var _this6 = this;

      this.root = rootPath;
      this.env = env;
      this.tenant = tenant;

      if (!fs.existsSync(path.join(this.root, this.tenant))) {
        console.log("Project ".concat(this.tenant, " not found."));
        process.exit(1);
      }

      if (output) {
        var extention = path.extname(output);

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

      this.outputTemp = path.join(this.output, "".concat(this.tenant, "_").concat(this.version));
      console.log("Tenant: ".concat(this.tenant, "_").concat(this.version));
      console.log("Output: ".concat(this.output));
      console.log("Output CAR name: ".concat(this.outputCarName));

      _helper["default"].EnsureFolderExists(this.output);

      (0, _rimraf["default"])(path.join(this.output, "".concat(this.env, "-").concat(this.tenant, "_").concat(this.version, ".car")), function () {
        _helper["default"].EnsureFolderExists(_this6.output);

        _helper["default"].EnsureFolderExists(_this6.outputTemp);

        _this6.BuildArtifactsStart();

        _this6.BuildCommonRegistryConfigs();

        _this6.BuildCommonSynapseConfigs();

        _this6.BuildRegistryConfigs();

        _this6.BuildSynapseConfigs();

        _this6.BuildArtifactsEnd();

        _this6.BuildCApp();
      });
    }
  }]);

  return Builder;
}();

var _default = new Builder();

exports["default"] = _default;