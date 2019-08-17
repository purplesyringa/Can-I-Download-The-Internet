const {ZimCreator} = require("@openzim/libzim");

const address = process.argv[2];

process.stdin.resume(); // Don't sleep

(async () => {
	try {
		console.log(`Site:          ${address}`);

		const zf = await require("./zeroframe")(address);

		const siteInfo = await zf.cmdp("siteInfo");
		console.log(`Address:       ${siteInfo.address}`);
		console.log(`Title:         ${siteInfo.content.title}`);
		console.log(`Description:   ${siteInfo.content.description}`);

		let dbschema = await zf.cmdp("fileGet", ["dbschema.json"]);
		try {
			dbschema = JSON.parse(dbschema);
		} catch(e) {
			dbschema = null;
		}
		console.log(`Database:      ${dbschema ? dbschema.db_file : "none"}`);

		// Detect site type
		let siteType = "Unknown";
		if(
			siteInfo.content.description === "Decentralized forum with ZeroID" ||
			(
				dbschema &&
				dbschema.db_name === "ZeroTalk" &&
				dbschema.db_file === "data/users/zerotalk.db" &&
				dbschema.tables &&
				dbschema.tables.topic
			)
		) {
			siteType = "ZeroTalk";
		}

		console.log(`Detected type: ${siteType}`);

		const creator = new ZimCreator({fileName: `${address}.zim`, welcome: "index.html"});

		const gather = require(`./gather/${siteType}`);
		await gather(zf, creator);
		await creator.finalise();

		console.log("Done");

		process.exit(0);
	} catch(e) {
		console.error(e);
		process.exit(1);
	}
})();