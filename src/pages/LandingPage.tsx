import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = [
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
  { to: "/support", label: "Support" },
  { to: "/faq", label: "FAQ" },
  { to: "/common-issues", label: "Common Issues" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <section className="relative min-h-screen bg-gradient-hero">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0 opacity-35"
            style={{
              background:
                "linear-gradient(120deg, rgba(15,23,42,0.45), rgba(14,165,233,0.12), rgba(34,197,94,0.10), rgba(15,23,42,0.45))",
              backgroundSize: "220% 220%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />

        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="w-full">
            <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <span className="font-bold text-white">Smart Design AI</span>
              </div>
              <p className="text-xs text-white/50 hidden sm:block">NLP + ML Powered</p>
            </div>
          </header>

          <main className="flex-1 grid place-items-center px-6 py-10 md:py-14">
            <div className="max-w-[900px] w-full text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-xs sm:text-sm tracking-wide text-white/80">Powered by NLP &amp; Machine Learning</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.95] mb-4"
              >
                Smart Product Design
                <br />
                <span className="text-gradient-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Assistance
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/60 mb-8 max-w-2xl mx-auto"
              >
                Design smarter. Build better. <span className="text-white/80">Optimize before you manufacture.</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
              >
                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.28 }}>
                  <Link to="/login">
                    <Button variant="hero" size="xl" className="min-w-[210px] hover:shadow-[0_0_28px_rgba(255,255,255,0.18)] transition-all">
                      Start Designing
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.28 }}>
                  <Link to="/login">
                    <Button variant="hero-outline" size="xl" className="min-w-[210px] text-white border-white/20 hover:bg-white/10 transition-all">
                      Login
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="max-w-3xl mx-auto"
              >
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
                  <span>Feasibility-first workflow</span>
                  <span className="hidden sm:inline text-white/25">|</span>
                  <span>Cost-aware suggestions</span>
                  <span className="hidden sm:inline text-white/25">|</span>
                  <span>Manufacturing-ready steps</span>
                </div>
              </motion.div>
            </div>
          </main>

          <footer className="w-full pb-10 px-6">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              {footerLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative text-white/65 hover:text-white transition-colors"
                >
                  {item.label}
                  <span className="absolute left-0 -bottom-1 h-px w-full bg-white/75 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
              ))}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
