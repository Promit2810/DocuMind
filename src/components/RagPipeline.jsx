import { motion } from "framer-motion";

const stages = [
  {
    number: "01",
    label: "DOCUMENT",
    title: "Upload",
    description: "Your document enters the DocuMind knowledge pipeline.",
    icon: "▣",
  },
  {
    number: "02",
    label: "EXTRACT",
    title: "Extract",
    description: "Text is extracted and prepared for intelligent processing.",
    icon: "↓",
  },
  {
    number: "03",
    label: "CHUNKS",
    title: "Split",
    description: "Large documents are divided into meaningful chunks.",
    icon: "◈",
  },
  {
    number: "04",
    label: "RETRIEVE",
    title: "Semantic Search",
    description: "Relevant chunks are retrieved using semantic similarity.",
    icon: "⌕",
  },
  {
    number: "05",
    label: "RAG",
    title: "Generate",
    description: "The AI uses retrieved context to generate an answer.",
    icon: "✦",
  },
  {
    number: "06",
    label: "SOURCE",
    title: "Cite",
    description: "The answer is connected back to its document source.",
    icon: "◇",
  },
];

function PipelineNode({ stage, index }) {
  return (
    <motion.div
      className="pipeline-node"
      initial={{
        opacity: 0,
        y: 35,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.25,
      }}
      transition={{
        duration: 0.65,
        delay: index * 0.1,
      }}
    >
      <div className="pipeline-number">
        {stage.number}
      </div>

      <motion.div
        className="pipeline-card"
        whileHover={{
          y: -8,
          rotateX: 4,
          rotateY: -4,
          scale: 1.02,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 18,
        }}
      >
        <div className="pipeline-glow" />

        <div className="pipeline-card-top">
          <span>{stage.label}</span>

          <span className="pipeline-arrow">
            ↗
          </span>
        </div>

        <div className="pipeline-icon">
          <motion.div
            animate={{
              y: [-3, 3, -3],
              rotate: [0, 4, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.25,
            }}
          >
            {stage.icon}
          </motion.div>
        </div>

        <h3>
          {stage.title}
        </h3>

        <p>
          {stage.description}
        </p>
      </motion.div>
    </motion.div>
  );
}


function FlowParticles() {
  return (
    <div className="flow-particles">
      {[0, 1, 2, 3, 4].map((item) => (
        <motion.span
          key={item}
          className="flow-particle"
          animate={{
            x: [0, 170, 340, 510, 680],
            opacity: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
            delay: item * 0.9,
          }}
        />
      ))}
    </div>
  );
}


export default function RagPipeline() {
  return (
    <div className="rag-pipeline">

      <div className="pipeline-orbital-glow" />

      <div className="pipeline-line">
        <motion.div
          className="pipeline-energy"
          animate={{
            x: ["-10%", "110%"],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <FlowParticles />

      <div className="pipeline-grid">
        {stages.map((stage, index) => (
          <PipelineNode
            key={stage.number}
            stage={stage}
            index={index}
          />
        ))}
      </div>

      <motion.div
        className="pipeline-answer"
        initial={{
          opacity: 0,
          scale: 0.92,
        }}
        whileInView={{
          opacity: 1,
          scale: 1,
        }}
        viewport={{
          once: true,
          amount: 0.3,
        }}
        transition={{
          duration: 0.8,
          delay: 0.5,
        }}
      >
        <div className="answer-orb">
          <motion.span
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            ✦
          </motion.span>
        </div>

        <div className="answer-content">
          <span className="answer-label">
            FINAL OUTPUT
          </span>

          <strong>
            Grounded AI Answer
          </strong>

          <p>
            Generated from retrieved document context.
          </p>
        </div>

        <div className="answer-source">
          <span>◈</span>
          SOURCE / PAGE 12
        </div>
      </motion.div>

    </div>
  );
}