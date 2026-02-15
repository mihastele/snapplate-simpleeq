# 🍽️ Snapplate

**Open-source AI-powered calorie tracker.** Snap a photo of your plate and get instant nutritional estimates.

## Features

- **📸 Food Scanning** — Take a photo or upload an image of your meal. AI identifies each food item and estimates calories, protein, carbs, and fat.
- **📊 Daily Dashboard** — Visual calorie ring showing progress toward your daily goal, with macro breakdowns.
- **🧮 TDEE Calculator** — Calculate your daily calorie needs based on sex, age, weight, height, and activity level (Mifflin-St Jeor equation).
- **📅 History** — Browse past days and review logged meals.
- **📱 PWA** — Works on any device. Install it on your home screen for a native app experience.
- **🔒 Privacy-first** — All data stored locally in your browser. Your API key never leaves your device (sent directly to OpenAI).

## Getting Started

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to GPT-4o

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setup

1. Go to **Settings** tab
2. Enter your OpenAI API key
3. Fill in your profile for personalized calorie goals
4. Start scanning your meals!

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **OpenAI GPT-4o Vision** for food recognition
- **localStorage** for data persistence
- **Service Worker** for offline PWA support

## How It Works

1. You take a photo of your food (or upload one)
2. The image is sent to OpenAI's GPT-4o vision model
3. The AI identifies each food item and estimates nutritional values
4. Results are shown for review before logging
5. Logged meals are stored locally and contribute to your daily totals

## PWA Icons

The app includes an SVG icon at `public/icons/icon.svg`. For full PWA compatibility, generate PNG icons:

```bash
# Using sharp-cli
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-192.png resize 192 192
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-512.png resize 512 512
```

## License

MIT
# snapplate-simpleeq
