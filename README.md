# Evoke - A Multiplayer Word Guessing Game

Evoke is a fun and interactive game where players try to guess words based on cards related to those words. This game is designed to offer an exciting and entertaining multiplayer experience.

## Technologies Used

- [Vite](https://vitejs.dev/): A fast build tool for modern web applications.
- [pnpm](https://pnpm.io/): A fast and efficient package manager.
- [React](https://reactjs.org/): A JavaScript library for building user interfaces.
- [TypeScript](https://www.typescriptlang.org/): A statically typed programming language that enhances code safety and maintainability.
- [PeerJS](https://peerjs.com/): A JavaScript library for WebRTC peer-to-peer communication.
- DALL-E: A powerful image generation model by OpenAI for creating unique and creative images.

## Configuration and Installation

Follow these steps to set up and run the project locally on your machine:

1. Clone this repository to your machine:
   ```bash
   git clone https://github.com/your-username/evoke.git
   cd evoke
   ```
2. Install dependencies using pnpm:
    - If you do not have pnpm: [Install it](https://pnpm.io/installation)
   ```bash
   pnpm install
   ```
3. Images dependencies
    - Put your images in `public/images/` directory
    - Create a `images.json` file in `assets/` directory. It's an array of string with images filenames. eg :
    ```json
    [
        "image_20.webp",
        "image_112.webp",
        "image_77.webp",
    ]
    ```

3. Launch the application in development mode:
    ```bash
    pnpm run dev
    ```

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
  - [ ] Tests
  - [ ] It should work with `npm` but not tested