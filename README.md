# Evoke - A Multiplayer Word Guessing Game

![GitHub Workflow Status](https://github.com/Jeremy38100/Evoke/actions/workflows/merge-master.yml/badge.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/Jeremy38100/Evoke)
![GitHub top language](https://img.shields.io/github/languages/top/Jeremy38100/Evoke)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/Jeremy38100/Evoke)

Evoke is a fun and interactive game where players try to guess words based on cards related to those words. This game is designed to offer an exciting and entertaining multiplayer experience.

## Technologies Used

- ⚡️ [Vite](https://vitejs.dev/): A fast build tool for modern web applications.
- 🌐 [React](https://reactjs.org/): A JavaScript library for building user interfaces.
- ✅ [TypeScript](https://www.typescriptlang.org/): A statically typed programming language that enhances code safety and maintainability.
- 📨 [PeerJS](https://peerjs.com/): A JavaScript library for WebRTC peer-to-peer communication.
- 🧪[Playwright](https://playwright.dev/): A powerful library for controlling multiple pages in parallel.
- 🖼️ DALL-E: A powerful image generation model by OpenAI for creating unique and creative images.

## Configuration and Installation

Follow these steps to set up and run the project locally on your machine:

1. Clone this repository to your machine (prefer ssh access):

   ```bash
   git clone git@github.com:Jeremy38100/Evoke.git
   cd evoke
   ```
2. Install dependencies using npm:

   ```bash
   npm install
   ```
3. Images dependencies

   - Put your images in `public/images/` directory
   - Update a `images.json` file in `assets/` directory. It's an array of string with images filenames. eg :

   ```json
   [
       "image_0.webp",
       "image_1.webp",
       "image_2.webp",
   ]
   ```
4. Launch the application in development mode:

   ```bash
   npm run dev
   ```

## Running Tests

To run the tests in this project, run

   ```bash
   npm run test
   ```

This will build the project, and run a web server on port 4173 then run tests


## To-Do

Here are some tasks and features that we plan to implement in the future:

- Features
  - [ ] Cooperation game mode
  - [ ] Redraw cards before game started
  - [ ] Add a tutorial or onboarding process for new players.
- Quality of Life
  - [ ] Change favicon
  - [ ] Better handle disconnection
  - [ ] Fancy animations
  - [ ] Improve UI
  - [ ] Rework modal to handle click outside
  - [ ] Better visibility for flipped card from game master PoV
- DevOps
  - [ ] Build and Deploy
  - [ ] Full e2e test
  - [x] Playwright test with host/clients
