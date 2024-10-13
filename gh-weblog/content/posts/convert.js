import fs from "fs/promises";
const index = {};
const dir = await fs.readdir(`./metadata`);
for (const filename of dir) {
  if (filename === `.` || filename === `..`) continue;
  const content = (await fs.readFile(`./metadata/${filename}`)).toString(
    `utf-8`
  );
  try {
    const data = JSON.parse(content);
    const id = filename.replace(`.json`, ``);
    index[id] = {
      title: data.title,
      published: data.published,
      tags: data.tags,
    };
  } catch (e) {
    console.log(filename, content);
    process.exit(1);
  }
}
fs.writeFile(`index.json`, JSON.stringify(index, null, 2));
