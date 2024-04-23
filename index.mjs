import { createClient as createManagementClient } from "@tursodatabase/api";
import { createClient as createDbClient, LibsqlError } from "@libsql/client";

const schemaDbUrl = process.env["TURSO_CONNECTION_URL"];
const authToken = process.env["TURSO_AUTH_TOKEN"];
const managementToken = process.env["TURSO_MANAGEMENT_TOKEN"];
const tursoOrg = process.env["TURSO_ORG"];
const tursoGroup = process.env["TURSO_GROUP"];
const schemaDb = process.env["TURSO_SCHEMA_DB"];

if (
  !schemaDbUrl ||
  !authToken ||
  !managementToken ||
  !tursoOrg ||
  !tursoGroup ||
  !schemaDb
) {
  throw new Error("Missing envvars");
}

const SCHEMA = `
CREATE TABLE slack_messages (
	id integer PRIMARY KEY NOT NULL,
	ts text NOT NULL,
	sub_type text NOT NULL,
	hidden integer NOT NULL,
	user_id text NOT NULL,
	channel_id text NOT NULL,
	thread_id text NOT NULL,
	text_content text NOT NULL
);
`;

const main = async () => {
  console.log("Imitating migration");
  const schemaClient = createDbClient({ url: schemaDbUrl, authToken });
  await schemaClient.execute(SCHEMA);

  console.log("Waiting to ensure things have been propagated...");
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Imitating new customer signing up");
  const newDbID = `${tursoGroup}-customer-1`;
  const managementClient = createManagementClient({
    org: tursoOrg,
    token: managementToken,
  });
  const newDb = await managementClient.databases.create(newDbID, {
    group: tursoGroup,
    schema: schemaDb,
  });

  console.log("Waiting to ensure things have been propagated...");
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Imitating new slack message arriving in customer workspace");
  const connectionUrl = `libsql://${newDb.hostname}`;
  const dbClient = createDbClient({ url: connectionUrl, authToken });
  const insertMessages = [
    {
      ts: "1713461663.539999",
      subType: "",
      hidden: true,
      userId: "U02QS0PKCQZ",
      channelId: "C06UA1583S6",
      threadId: "1713461663.539999",
      textContent: "aa",
    },
  ];
  await dbClient.batch(
    insertMessages.map((m) => ({
      sql: `INSERT INTO slack_messages (ts, sub_type, hidden, user_id, channel_id, thread_id, text_content)
            VALUES (:ts, :subType, :hidden, :userId, :channelId, :threadId, :textContent)`,
      args: {
        ts: m.ts,
        subType: m.subType,
        hidden: +m.hidden, // boolean to integer
        userId: m.userId,
        channelId: m.channelId,
        threadId: m.threadId,
        textContent: m.textContent,
      },
    })),
    "write",
  );
  console.log("All done");
};

main().catch((e) => {
  console.error("Failed to process", e);
  if (e instanceof LibsqlError) {
    console.error("LibsqlError details:", e.code, e.rawCode, e.message);
  }
  process.exit(1);
});
