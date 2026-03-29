import { JsonFormatter } from "@/components/json-formatter";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-12 max-w-7xl mx-auto py-12 px-4">
      {/* Header Section */}
      <section className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl bg-gradient-to-r from-primary via-primary/80 to-primary/40 bg-clip-text text-transparent">
          JSON Lens
        </h1>
        <p className="text-xl text-muted-foreground font-light">
          A modern, high-performance JSON formatter and validator designed for the next generation of web developers.
        </p>
      </section>

      {/* Main Tool section */}
      <div className="w-full">
        <JsonFormatter />
      </div>

      {/* Footer Info / Features */}
      <footer className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-primary/20">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-semibold text-primary">Instant Format</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Beautify your JSON strings instantly with one click. Supports nested objects and large files.
          </p>
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-semibold text-primary">Smart Validation</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Real-time validation with detailed error messages and line-number highlighting.
          </p>
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-semibold text-primary">Glass Aesthetic</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A beautiful, minimal interface that works perfectly in both light and dark modes.
          </p>
        </div>
      </footer>
    </div>
  );
}
