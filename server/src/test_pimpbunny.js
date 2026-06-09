import { getVideoInfo } from './services/ytdlp.js';

async function main() {
  const url = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  console.log(`Fetching info for: ${url}`);
  try {
    const info = await getVideoInfo(url);
    console.log('\n--- Metadata Extracted ---');
    console.log(`Title: ${info.title}`);
    console.log(`Thumbnail: ${info.thumbnail}`);
    console.log(`Formats Extracted: ${info.formats.length}`);
    info.formats.forEach((f, i) => {
      console.log(`\nFormat ${i}:`);
      console.log(`  resolution: ${f.resolution}`);
      console.log(`  format_id: ${f.format_id.substring(0, 100)}...`);
    });
  } catch (err) {
    console.error('Extraction failed:', err);
  }
}

main();
