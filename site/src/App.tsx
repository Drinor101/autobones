import { Hero } from "./Hero";
import { Playground } from "./Playground";
import { Frameworks, LayoutMemory } from "./Frameworks";
import { CallToAction, Compare, Features, Footer, HowItWorks, Nav } from "./Sections";

export default function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Playground />
        <Features />
        <Frameworks />
        <LayoutMemory />
        <Compare />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
