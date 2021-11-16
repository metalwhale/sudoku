# Latest Node LTS version
FROM node:16.13.0-bullseye

USER node

# Setup Rust toolchain. See: https://rustwasm.github.io/docs/book/game-of-life/setup.html
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.56
ENV PATH=/home/node/.cargo/bin:$PATH USER=node
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh \
    && rustup component add rustfmt clippy \
    && cargo install cargo-edit cargo-generate
