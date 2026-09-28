# StockPulse Frontend

This is the frontend application for StockPulse, an AI-powered inventory and pricing management system built with React and Vite.

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```
VITE_API_URL=http://localhost:4000
```

You can copy the `.env.example` file to `.env` and modify as needed:

```bash
cp .env.example .env
```

## Development

To run the development server:

```bash
npm install
npm run dev
```

The application will be available at http://localhost:5173

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Linting

```bash
npm run lint
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
