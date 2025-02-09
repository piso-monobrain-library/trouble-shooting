const fs = require('fs');
const path = require('path');

function createIndexHtml(directoryStructure) {
	const buildDir = path.join(__dirname, '../build');
	const indexPath = path.join(buildDir, 'index.html');
	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trouble Shooting</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <main class="root">
        <h1>Trouble Shooting</h1>
            ${Object.entries(directoryStructure)
				.map(
					([key, value]) => `
                <section>
                    <h2>${key}</h2>
                    <ul>${value.map((item) => `<li><a href="${key}/${item}/index.html">${item}</a></li>`).join('')}</ul>
                </section>
                `
				)
				.join('')}
    </main>
</body>
</html>
`;

	// Ensure the build directory exists
	if (!fs.existsSync(buildDir)) {
		fs.mkdirSync(buildDir, { recursive: true });
	}

	// Write the index.html file
	fs.writeFileSync(indexPath, htmlContent, 'utf8');
	console.log('index.html has been created in the build directory.');
}

function getSubdirectories(dirPath) {
	const result = {};

	function readDir(currentPath, obj, parentKey) {
		const items = fs.readdirSync(currentPath, { withFileTypes: true });
		items.forEach((item) => {
			if (item.isDirectory()) {
				if (!obj[parentKey]) {
					obj[parentKey] = [];
				}
				obj[parentKey].push(item.name);
				readDir(path.join(currentPath, item.name), obj, parentKey);
			}
		});
	}

	const srcItems = fs.readdirSync(dirPath, { withFileTypes: true });
	srcItems.forEach((item) => {
		if (item.isDirectory()) {
			const subDirPath = path.join(dirPath, item.name);
			result[item.name] = [];
			readDir(subDirPath, result, item.name);
		}
	});

	return result;
}

const directoryStructure = getSubdirectories(path.join(__dirname, '../src'));
createIndexHtml(directoryStructure);
