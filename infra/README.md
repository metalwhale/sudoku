# Infrastructure

## Starting up
- Create `.env` file and specify variables:
  ```bash
  host$ cp .env.example .env
  ```
- Start and get into the container:
  ```bash
  host$ docker compose up -d
  host$ docker compose exec app bash
  ```

## How to initialize `app`
[Reference]()
- Generate wasm project:
  <pre>
  app$ cargo generate --git https://github.com/rustwasm/wasm-pack-template --name <i>wasm</i>
  </pre>
- Create nuxt app:
  <pre>
  app$ yarn create nuxt-app www
  yarn create v1.22.15
  ...
  create-nuxt-app v3.7.1
  ✨  Generating Nuxt.js project in <i>www</i>
  ? Project name: <i>sudoku</i>
  ? Programming language: TypeScript
  ? Package manager: Yarn
  ? UI framework: None
  ? Nuxt.js modules:
  ? Linting tools:
  ? Testing framework: None
  ? Rendering mode: Single Page App
  ? Deployment target: Static (Static/Jamstack hosting)
  ? Development tools:
  ? What is your GitHub username?
  ? Version control system: Git
  </pre>
- Clean up:
  ```bash
  app$ rm -rf www/.git
  ```

## VSCode extensions:
- `tamasfe.even-better-toml`: [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml)
- `matklad.rust-analyzer`: [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=matklad.rust-analyzer)
- `octref.vetur`: [Vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur)
- `esbenp.prettier-vscode`: [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
