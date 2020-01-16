const fs = require("fs");

export default {
	EnsureFolderExists: (path) => {
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
	},
	GetDirectories: (srcpath) => {
		return fs.readdirSync(srcpath)
			.filter(file => fs.lstatSync(path.join(srcpath, file)).isDirectory());
	}
};