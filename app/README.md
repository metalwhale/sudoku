## Developing
- Build the wasm project:
  ```bash
  app$ cd wasm/
  app$ wasm-pack build
  ```
- Navigate to nuxt project folder and install dependencies:
  ```bash
  app$ cd ../www/
  app$ yarn install
  ```
- Launch:
  ```bash
  app$ yarn dev

## Deploying
- Generate `dist` to deploy on Github Pages:
  ```bash
  app$ cd www/
  app$ BASE_URL="/sudoku/" yarn generate
  ```
- Serve the `dist` directory:
  ```bash
  app$ BASE_URL="/sudoku/" yarn start
  ```
