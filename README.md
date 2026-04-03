# star-history-cli

Generate star history trend charts for GitHub open-source projects.

Inspired by [star-history.com](https://www.star-history.com/), with a hand-drawn xkcd style and a clean style.

## Install

```bash
# Use directly without installing
npx star-history-cli facebook/react

# Or install globally
npm install -g star-history-cli
star-history facebook/react
```

## Usage

```bash
# Basic - generate PNG chart (xkcd style by default)
star-history facebook/react

# SVG output
star-history facebook/react -f svg

# Clean style + dark theme
star-history facebook/react -s clean --theme dark

# Multiple repos comparison
star-history facebook/react,vuejs/vue,angular/angular

# Timeline mode (aligned relative time)
star-history facebook/react -t Timeline

# Export raw data
star-history facebook/react --export csv
star-history facebook/react --export json

# Custom width and output path
star-history facebook/react --width 1200 -o my-chart.png

# With GitHub token
star-history facebook/react --token ghp_xxxx
# or set environment variable
export GITHUB_TOKEN=ghp_xxxx
star-history facebook/react
```

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `repos` | | *required* | GitHub repos (comma-separated) |
| `--style` | `-s` | `xkcd` | Chart style: `xkcd` / `clean` |
| `--type` | `-t` | `Date` | Chart mode: `Date` / `Timeline` |
| `--format` | `-f` | `png` | Output format: `png` / `svg` |
| `--theme` | | `light` | Theme: `light` / `dark` |
| `--width` | | `800` | Image width in pixels |
| `--output` | `-o` | auto | Output file path |
| `--export` | | | Data export: `csv` / `json` |
| `--token` | | | GitHub personal access token |

## GitHub Token

Without a token, the GitHub API limits you to **60 requests/hour**. For higher limits (5,000 requests/hour):

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token (no special scopes needed for public repos)
3. Use `--token` option or set `GITHUB_TOKEN` environment variable

## License

MIT
