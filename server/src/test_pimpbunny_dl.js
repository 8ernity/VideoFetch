import { getVideoInfo, streamDownload } from './services/ytdlp.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const url = 'https://pimpbunny.com/videos/waifu-cristal-pleases-her-creamy-pussy/';
  console.log(`Fetching info for: ${url}`);
  try {
    const info = await getVideoInfo(url);
    const format = info.formats[0]; // 1080p
    console.log(`Selected format resolution: ${format.resolution}`);
    console.log(`Selected format_id: ${format.format_id}`);

    // Mock response object
    const mockRes = {
      headers: {},
      statusCode: 200,
      setHeader(name, val) {
        this.headers[name] = val;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      on(event, handler) {
        // no-op
      },
      write(chunk) {
        // no-op
      },
      end() {
        console.log('Response ended');
      },
      pipe(dest) {
        console.log('Piping output stream...');
        dest.on('finish', () => console.log('Pipe destination finished'));
        return dest;
      }
    };

    const dummyOut = fs.createWriteStream(path.join(process.cwd(), 'temp_downloads', 'dummy_pimpbunny.mp4'));

    console.log('Testing full streamDownload without trim...');
    try {
      await streamDownload(url, format.format_id, format.type, mockRes, () => console.log('Headers set callback'), false, null);
      console.log('Full streamDownload successful!');
    } catch (err) {
      console.error('Full streamDownload failed:', err);
    }

    console.log('\nTesting streamDownload WITH trim (0 to 10 seconds)...');
    try {
      await streamDownload(url, format.format_id, format.type, mockRes, () => console.log('Headers set callback (trim)'), false, { start: 0, end: 10 });
      console.log('Trim streamDownload successful!');
    } catch (err) {
      console.error('Trim streamDownload failed:', err.message);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

main();
