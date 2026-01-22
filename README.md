# Retro-Trade: Stock Replay Simulator

A React application for simulating stock trading replays.

## Getting Started

### Prerequisites

- Node.js (v20 or later recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd retro-trade
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Create a `.env` file in the root directory.
   - Add your Gemini API key (if required):
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.

## Deployment

This project is configured to automatically deploy to **GitHub Pages** using GitHub Actions.

1. Ensure your repository is on GitHub.
2. Go to **Settings > Pages** in your repository.
3. Under "Build and deployment", verify the source is set to "Deploy from a branch".
4. The GitHub Action will automatically push the build artifacts to the `gh-pages` branch.
5. Once the first action runs successfully, ensure the **Pages** settings point to the `gh-pages` branch.

## Project Structure

- `src/`: Source code
  - `components/`: React components
  - `services/`: API services and logic
- `vite.config.ts`: Vite configuration
