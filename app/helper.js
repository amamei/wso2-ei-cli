"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var fs = require("fs");

var _default = {
  EnsureFolderExists: function EnsureFolderExists(path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  },
  GetDirectories: function GetDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function (file) {
      return fs.lstatSync(path.join(srcpath, file)).isDirectory();
    });
  }
};
exports["default"] = _default;