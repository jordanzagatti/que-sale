/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

(async () => {
  const source = await fs.readFile(
    path.join("public", "icons", "icon.svg"),
    "utf8",
  );
  const maskable = source.replace(/rx="116"/g, 'rx="0"');
  const badge =
    '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><text x="36" y="49" text-anchor="middle" font-family="Arial" font-size="36" font-weight="700" fill="#ffffff">Q</text></svg>';

  await sharp(Buffer.from(source)).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(Buffer.from(source)).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/maskable-512.png");
  await sharp(Buffer.from(source)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
  await sharp(Buffer.from(badge)).resize(72, 72).png().toFile("public/icons/badge-72.png");
  await sharp(Buffer.from(source)).resize(512, 512).png().toFile("src/app/icon.png");

  console.log("icons generated");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
