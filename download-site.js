const address = process.argv[2];

(async () => {
	const zf = await require("./zeroframe")(address);
	console.log(await zf.cmdp("siteInfo"));
})();