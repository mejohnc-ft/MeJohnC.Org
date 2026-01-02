import { motion } from 'framer-motion';

const GeometricBackground = () => {
  const shapes = [
    { type: 'circle', size: 300, x: '10%', y: '20%', duration: 20 },
    { type: 'square', size: 200, x: '80%', y: '10%', duration: 25, rotate: 45 },
    { type: 'circle', size: 150, x: '70%', y: '70%', duration: 18 },
    { type: 'square', size: 100, x: '20%', y: '80%', duration: 22, rotate: 12 },
    { type: 'circle', size: 80, x: '50%', y: '50%', duration: 30 },
    { type: 'square', size: 250, x: '90%', y: '40%', duration: 28, rotate: -20 },
    { type: 'circle', size: 120, x: '5%', y: '60%', duration: 24 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((shape, index) => (
        <motion.div
          key={index}
          className={`absolute border border-primary/10 ${
            shape.type === 'circle' ? 'rounded-full' : ''
          }`}
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
            transform: `translate(-50%, -50%) rotate(${shape.rotate || 0}deg)`,
          }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 20, 0, -20, 0],
            rotate: shape.type === 'square' ? [shape.rotate || 0, (shape.rotate || 0) + 360] : 0,
            scale: [1, 1.05, 1, 0.95, 1],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(25 30% 30%) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(25 30% 30%) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient fade at edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
};

export default GeometricBackground;
