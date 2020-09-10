"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _rimraf = _interopRequireDefault(require("rimraf"));

var _archiver = _interopRequireDefault(require("archiver"));

var _helper = _interopRequireDefault(require("./helper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Builder = /*#__PURE__*/function () {
  function Builder() {
    _classCallCheck(this, Builder);

    this.XmlHeaderTemplate = '<?xml version="1.0" encoding="UTF-8"?>';
    this.SynapseArtifactTemplate = '<?xml version="1.0" encoding="UTF-8"?><artifact name="${artifact}" version="${version}" type="${media-type}" serverRole="EnterpriseServiceBus"><file>${artifact}.xml</file></artifact>';
    this.RegistryArtifactTemplate = '<artifact name="${artifact}" version="${version}" type="registry/resource" serverRole="EnterpriseServiceBus"><file>registry-info.xml</file></artifact>';
    this.RegistryInfoTemplate = '<resources><item><file>${artifact}${extension}</file><path>/_system/governance/${type}</path><mediaType>${mediaType}</mediaType></item></resources>';
    this.MetaTypes = {
      'synapse-config': {
        templates: 'synapse/template',
        sequences: 'synapse/sequence',
        api: 'synapse/api',
        'proxy-services': 'synapse/proxy-service',
        dataservice: 'service/dataservice'
      },
      registry: {
        wsdls: 'application/wsdl+xml',
        swaggers: 'text/plain',
        endpoints: 'application/vnd.wso2.esb.endpoint',
        policies: 'application/wspolicy+xml',
        xslts: 'application/xslt+xml',
        scripts: 'application/javascript'
      }
    };
    this.version = '1.0.0';
    this.root = null;
    this.env = null;
    this.tenant = null;
  }

  _createClass(Builder, [{
    key: "CreateProject",
    value: function CreateProject(_root, project) {
      _helper["default"].EnsureFolderExists(_path["default"].join(_root, project));

      for (var _i = 0, _Object$keys = Object.keys(this.MetaTypes); _i < _Object$keys.length; _i++) {
        var metaType = _Object$keys[_i];

        _helper["default"].EnsureFolderExists(_path["default"].join(_root, project, metaType));

        for (var _i2 = 0, _Object$keys2 = Object.keys(this.MetaTypes[metaType]); _i2 < _Object$keys2.length; _i2++) {
          var type = _Object$keys2[_i2];

          _helper["default"].EnsureFolderExists(_path["default"].join(_root, project, metaType, type));
        }
      }
    }
  }, {
    key: "BuildRegistryArtifact",
    value: function BuildRegistryArtifact(file, type) {
      var extension = _path["default"].extname(file);

      var artifactName = _path["default"].basename(file, extension);

      var artifact = artifactName + "_" + this.version;

      _helper["default"].EnsureFolderExists(_path["default"].join(this.outputTemp, artifact));

      _helper["default"].EnsureFolderExists(_path["default"].join(this.outputTemp, artifact, "resources"));

      var fileContent = _fs["default"].readFileSync(file, 'utf8');

      var envVarFilePath = _path["default"].join(this.root, this.tenant, "env.json");

      if (_fs["default"].existsSync(envVarFilePath)) {
        var templates = _toConsumableArray(new Set(fileContent.match(/\{\{__[\w\.]+__\}\}/g)));

        var envVars = JSON.parse(_fs["default"].readFileSync(envVarFilePath, 'utf8'));
        templates.forEach(function (template) {
          var varName = template.substring(4, template.length - 4);
          fileContent = fileContent.replace(new RegExp(template, 'g'), envVars[varName] || '');
        });
      }

      _fs["default"].writeFileSync(_path["default"].join(this.outputTemp, artifact, "resources", artifactName + extension), fileContent);

      var content = this.XmlHeaderTemplate + this.RegistryArtifactTemplate.replace(/\$\{artifact\}/g, artifactName).replace(/\$\{version\}/g, this.version);

      _fs["default"].writeFile(_path["default"].join(this.outputTemp, artifact, "artifact.xml"), content, function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });

      content = this.XmlHeaderTemplate + this.RegistryInfoTemplate.replace(/\$\{artifact\}/g, artifactName).replace(/\$\{version\}/g, this.version).replace(/\$\{type\}/g, type).replace(/\$\{extension\}/g, extension).replace(/\$\{mediaType\}/g, this.MetaTypes.registry[type]);

      _fs["default"].writeFile(_path["default"].join(this.outputTemp, artifact, "registry-info.xml"), content, function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });
    }
  }, {
    key: "BuildSynapseArtifact",
    value: function BuildSynapseArtifact(file, type) {
      var extension = _path["default"].extname(file);

      var artifactName = _path["default"].basename(file, extension);

      var artifact = artifactName + "_" + this.version;

      _helper["default"].EnsureFolderExists(_path["default"].join(this.outputTemp, artifact));

      var fileContent = _fs["default"].readFileSync(file, 'utf8');

      var templates = _toConsumableArray(new Set(fileContent.match(/\{\{__[\w\.]+__\}\}/g)));

      var envVarFilePath = _path["default"].join(this.root, this.tenant, "env.json");

      if (_fs["default"].existsSync(envVarFilePath)) {
        var envVars = JSON.parse(_fs["default"].readFileSync(envVarFilePath, 'utf8'));
        templates.forEach(function (template) {
          var varName = template.substring(4, template.length - 4);
          fileContent = fileContent.replace(new RegExp(template, 'g'), envVars[varName] || '');
        });
      }

      _fs["default"].writeFileSync(_path["default"].join(this.outputTemp, artifact, artifactName + extension), fileContent);

      var content = this.SynapseArtifactTemplate.replace(/\$\{artifact\}/g, artifactName).replace(/\$\{version\}/g, this.version).replace(/\$\{media\-type\}/g, this.MetaTypes["synapse-config"][type]);

      _fs["default"].writeFile(_path["default"].join(this.outputTemp, artifact, "artifact.xml"), content, function (err) {
        if (err) {
          console.log(err);
          throw err;
        }
      });
    }
  }, {
    key: "BuildRegistryConfigs",
    value: function BuildRegistryConfigs(projectName) {
      var _this = this;

      for (var type in this.MetaTypes.registry) {
        if (!_fs["default"].existsSync(_path["default"].join(this.root, projectName, "registry", type))) continue;

        _fs["default"].readdirSync(_path["default"].join(this.root, projectName, "registry", type)).forEach(function (file) {
          var extension = _path["default"].extname(file);

          if (!extension || extension.length === 0 || _fs["default"].existsSync(_path["default"].join(_this.root, projectName, "registry", type, _this.env, file))) return;

          var fileName = _path["default"].basename(file, extension);

          _this.BuildArtifactsAddDependency(fileName);

          _this.BuildRegistryArtifact(_path["default"].join(_this.root, projectName, "registry", type, _path["default"].basename(file)), type);
        });

        if (_fs["default"].existsSync(_path["default"].join(this.root, projectName, "registry", type, this.env))) {
          _fs["default"].readdirSync(_path["default"].join(this.root, projectName, "registry", type, this.env)).forEach(function (file) {
            var extension = _path["default"].extname(file);

            _this.BuildArtifactsAddDependency(_path["default"].basename(file, extension));

            _this.BuildRegistryArtifact(_path["default"].join(_this.root, projectName, "registry", type, _this.env, _path["default"].basename(file)), type);
          });
        }
      }
    }
  }, {
    key: "BuildSynapseConfigs",
    value: function BuildSynapseConfigs(projectName) {
      var _this2 = this;

      for (var type in this.MetaTypes["synapse-config"]) {
        if (!_fs["default"].existsSync(_path["default"].join(this.root, projectName, "synapse-config", type))) {
          continue;
        }

        _fs["default"].readdirSync(_path["default"].join(this.root, projectName, "synapse-config", type)).forEach(function (file) {
          var extension = _path["default"].extname(file);

          if (!extension || extension.length === 0 || _fs["default"].existsSync(_path["default"].join(_this2.root, projectName, "synapse-config", type, _this2.env, file))) return;

          var fileName = _path["default"].basename(file, extension);

          _this2.BuildArtifactsAddDependency(fileName);

          _this2.BuildSynapseArtifact(_path["default"].join(_this2.root, projectName, "synapse-config", type, _path["default"].basename(file)), type);
        });

        if (_fs["default"].existsSync(_path["default"].join(this.root, projectName, "synapse-config", type, this.env))) {
          _fs["default"].readdirSync(_path["default"].join(this.root, projectName, "synapse-config", type, this.env)).forEach(function (file) {
            var extension = _path["default"].extname(file);

            var fileName = _path["default"].basename(file, extension);

            _this2.BuildArtifactsAddDependency(fileName);

            _this2.BuildSynapseArtifact(_path["default"].join(_this2.root, projectName, "synapse-config", type, _this2.env, _path["default"].basename(file)), type);
          });
        }
      }
    }
  }, {
    key: "BuildArtifactsStart",
    value: function BuildArtifactsStart() {
      _fs["default"].appendFileSync(_path["default"].join(this.outputTemp, "artifacts.xml"), "<?xml version=\"1.0\" encoding=\"UTF-8\"?><artifacts><artifact name=\"".concat(this.tenant, "\" version=\"").concat(this.version, "\" type=\"carbon/application\">"));
    }
  }, {
    key: "BuildArtifactsAddDependency",
    value: function BuildArtifactsAddDependency(artifact) {
      _fs["default"].appendFileSync(_path["default"].join(this.outputTemp, "artifacts.xml"), "<dependency artifact=\"".concat(artifact, "\" version=\"").concat(this.version, "\" include=\"true\" serverRole=\"EnterpriseServiceBus\"/>"));
    }
  }, {
    key: "BuildArtifactsEnd",
    value: function BuildArtifactsEnd() {
      _fs["default"].appendFileSync(_path["default"].join(this.outputTemp, "artifacts.xml"), "</artifact></artifacts>");
    }
  }, {
    key: "BuildCApp",
    value: function BuildCApp() {
      var _this3 = this;

      if (!this.outputCarName) this.outputCarName = "".concat(this.env, "-").concat(this.tenant, "_").concat(this.version, ".car");

      var outputZip = _fs["default"].createWriteStream(_path["default"].join(this.output, this.outputCarName));

      var zipArchive = (0, _archiver["default"])("zip");
      outputZip.on("close", function () {
        (0, _rimraf["default"])(_this3.outputTemp, function () {});
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
      var _this4 = this;

      this.root = rootPath;
      this.env = env;
      this.tenant = tenant;

      if (!_fs["default"].existsSync(_path["default"].join(this.root, this.tenant))) {
        console.log("Project ".concat(this.tenant, " not found."));
        process.exit(1);
      }

      if (output) {
        var extention = _path["default"].extname(output);

        if (extention === ".car") {
          this.outputCarName = _path["default"].basename(output);
          output = _path["default"].dirname(output);
          if (output == ".") output = "output";
        }

        if (_path["default"].isAbsolute(output)) {
          this.output = output;
        } else {
          this.output = _path["default"].join(this.root, output);
        }
      } else {
        this.output = _path["default"].join(this.root, "output");
      }

      this.outputTemp = _path["default"].join(this.output, "".concat(this.tenant, "_").concat(this.version));
      console.log("Tenant: ".concat(this.tenant, "_").concat(this.version));
      console.log("Output: ".concat(this.output));
      console.log("Output CAR name: ".concat(this.outputCarName));

      _helper["default"].EnsureFolderExists(this.output);

      (0, _rimraf["default"])(_path["default"].join(this.output, "".concat(this.env, "-").concat(this.tenant, "_").concat(this.version, ".car")), function () {
        _helper["default"].EnsureFolderExists(_this4.output);

        _helper["default"].EnsureFolderExists(_this4.outputTemp);

        _this4.BuildArtifactsStart();

        _this4.BuildRegistryConfigs('_common');

        _this4.BuildSynapseConfigs('_common');

        _this4.BuildRegistryConfigs(_this4.tenant);

        _this4.BuildSynapseConfigs(_this4.tenant);

        _this4.BuildArtifactsEnd();

        _this4.BuildCApp();
      });
    }
  }]);

  return Builder;
}();

var _default = new Builder();

exports["default"] = _default;