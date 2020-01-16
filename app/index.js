#!/usr/bin/env node
"use strict";

var _builder = _interopRequireDefault(require("./builder"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var args = require("minimist")(process.argv.slice(2));

var actions = args._;
if (!args.e) args.e = "prod";

switch (actions[0]) {
  case "new":
    _builder["default"].Create(process.cwd(), args.t);

    break;

  case "build":
    _builder["default"].Build(process.cwd(), args.t, args.e, args.o);

    break;

  case "version":
    var packageJson = require("../package.json");

    console.log("Package: ".concat(packageJson.name));
    console.log("Version: ".concat(packageJson.version));
    console.log("Author: ".concat(packageJson.author));
    process.exit(0);

  case "help:":
    showUsage();
    process.exit(0);

  default:
    showUsage();
    process.exit(1);
}

function showUsage() {
  console.log("Usage:");
  console.log("\tintegrator [command] [arguments]");
  console.log("\nCommands:");
  console.log("\tnew \t\tCreate new tenant");
  console.log("\tbuild \t\tCreate carbon application archive");
  console.log("\tversion \tShow package version");
  console.log("\thelp \t\tShow this help");
  console.log("\nArguments:");
  console.log("\t-t \t\tTenant name");
  console.log("\t-e \t\tEnvironment, (default: prod)");
  console.log("\t-o \t\tOutput path, it can be absolute or relative and can contains output carbon app name, (default: <environment>-<tenant name>_<version>.car)");
}