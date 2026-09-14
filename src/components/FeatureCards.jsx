import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  {
    number: "01",
    title: "Semantic Search",
    description:
      "Find the meaning behind your documents instead of searching only for exact words.",
    type: "search",
  },
  {
    number: "02",
    title: "AI Answers",
    description:
      "Retrieve the most relevant information and generate contextual answers with RAG.",
    type: "ai",
  },
  {
    number: "03",
    title: "Source Citations",
    description:
      "Trace every answer back to the document and page where the information was found.",
    type: "citation",
  },
  {
    number: "04",
    title: "Document Intelligence",
    description:
      "Transform multiple documents into an intelligent knowledge space you can explore.",
    type: "documents",
  },
];

/* =========================
   SEARCH VISUAL
========================= */

function SearchVisual() {
  return (
    <div className="feature-visual search-visual">
      <motion.div
        className="search-orbit orbit-one"
        animate={{ rotate: 360 }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="search-orbit orbit-two"
        animate={{ rotate: -360 }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="search-core"
        animate={{
          scale: [1, 1.12, 1],
          boxShadow: [
            "0 0 25px rgba(37, 99, 235, .25)",
            "0 0 60px rgba(59, 130, 246, .55)",
            "0 0 25px rgba(37, 99, 235, .25)",
          ],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        ⌕
      </motion.div>

      <motion.div
        className="search-node node-one"
        animate={{
          x: [0, 20, 0],
          y: [-10, 10, -10],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="search-node node-two"
        animate={{
          x: [0, -18, 0],
          y: [10, -10, 10],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/* =========================
   AI VISUAL
========================= */

function AIVisual() {
  return (
    <div className="feature-visual ai-visual">
      <motion.div
        className="ai-glow"
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="ai-sphere"
        animate={{
          rotateY: [0, 180, 360],
          scale: [1, 1.08, 1],
        }}
        transition={{
          rotateY: {
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          },
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        ✦
      </motion.div>

      <motion.div
        className="ai-ring ring-one"
        animate={{ rotate: 360 }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="ai-ring ring-two"
        animate={{ rotate: -360 }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "linear",
        }}
      />

    </div>
  );
}

/* =========================
   CITATION VISUAL
========================= */

function CitationVisual() {
  return (
    <div className="feature-visual citation-visual">
      <motion.div
        className="citation-document"
        animate={{
          rotateY: [-7, 7, -7],
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="citation-line" />
        <div className="citation-line short" />

        <motion.div
          className="citation-highlight"
          animate={{
            opacity: [0.55, 1, 0.55],
            scaleX: [0.94, 1, 0.94],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="citation-line" />
        <div className="citation-line medium" />

        <div className="citation-page">P. 12</div>
      </motion.div>

      <motion.div
        className="citation-pin"
        animate={{
          y: [-12, 12, -12],
          rotate: [0, 8, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        ◈
      </motion.div>
    </div>
  );
}

/* =========================
   DOCUMENTS VISUAL
========================= */

function DocumentsVisual() {
  return (
    <div className="feature-visual documents-visual">
      <motion.div
        className="mini-document doc-back"
        animate={{
          rotate: [-9, -5, -9],
          y: [0, 8, 0],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="mini-document doc-middle"
        animate={{
          rotate: [7, 3, 7],
          y: [7, -4, 7],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="mini-document doc-front"
        animate={{
          rotate: [-2, 2, -2],
          y: [-5, 5, -5],
        }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div />
        <div />
        <div />
      </motion.div>
    </div>
  );
}

/* =========================
   VISUAL SELECTOR
========================= */

function FeatureVisual({ type }) {
  if (type === "search") return <SearchVisual />;
  if (type === "ai") return <AIVisual />;
  if (type === "citation") return <CitationVisual />;

  return <DocumentsVisual />;
}

/* =========================
   FEATURE CARD
========================= */

function FeatureCard({ feature, index }) {
  const [mouse, setMouse] = useState({
    x: 0,
    y: 0,
  });

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width - 0.5) * 2;

    const y =
      ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    setMouse({
      x,
      y,
    });
  };

  const handleMouseLeave = () => {
    setMouse({
      x: 0,
      y: 0,
    });
  };

  return (
    <motion.article
      className="feature-card-3d"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{
        opacity: 0,
        y: 50,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
      }}
      animate={{
        rotateX: -mouse.y * 4,
        rotateY: mouse.x * 4,
      }}
      whileHover={{
        scale: 1.015,
      }}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      <div className="feature-card-glow" />

      <div className="feature-card-top">
        <span>{feature.number}</span>

        <motion.div
          className="feature-arrow"
          animate={{
            x: [0, 3, 0],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ↗
        </motion.div>
      </div>

      <FeatureVisual type={feature.type} />

      <div className="feature-card-content">
        <h3>{feature.title}</h3>

        <p>{feature.description}</p>
      </div>
    </motion.article>
  );
}

/* =========================
   MAIN COMPONENT
========================= */

export default function FeatureCards() {
  return (
    <div className="features-grid-3d">
      {features.map((feature, index) => (
        <FeatureCard
          key={feature.number}
          feature={feature}
          index={index}
        />
      ))}
    </div>
  );
}