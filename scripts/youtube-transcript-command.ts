function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function readNumberFlag(name: string, fallback: number) {
  const parsed = Number(readFlag(name))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`
}

const url = readFlag('url')
const outputDir = readFlag('output-dir') || 'storage/youtube-transcripts'
const proxy = readFlag('proxy')
const minSleep = readNumberFlag('min-sleep', 3)
const maxSleep = Math.max(minSleep, readNumberFlag('max-sleep', 15))
const userAgent =
  readFlag('user-agent') ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

if (!url) {
  console.error('Usage: npm run hardcore:youtube-transcript-command -- --url=https://www.youtube.com/watch?v=... [--proxy=http://...]')
  process.exit(1)
}

const args = [
  'yt-dlp',
  '--skip-download',
  '--write-auto-sub',
  '--write-sub',
  '--write-info-json',
  '--sub-lang',
  'en.*',
  '--sub-format',
  'vtt',
  '--no-playlist',
  '--skip-unavailable-fragments',
  '--sleep-interval',
  String(minSleep),
  '--max-sleep-interval',
  String(maxSleep),
  '--sleep-requests',
  String(minSleep),
  '--extractor-args',
  'youtube:player_client=web',
  '--user-agent',
  userAgent,
  '--output',
  `${outputDir}/%(id)s.%(ext)s`
]

if (proxy) {
  args.push('--proxy', proxy)
}

args.push(url)

console.log(args.map(shellQuote).join(' '))
