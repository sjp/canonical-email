import { App } from "./App";
import { hydrate, prerender as ssr } from "preact-iso";

export const Main = () => {
  return <App />;
};

if (typeof window !== "undefined") {
  hydrate(<Main />, document.getElementById("app") as HTMLElement);
}

export const prerender = async (_data: unknown) => {
  return await ssr(<Main />);
};

