import { motion } from 'framer-motion';
import { shouldReduceMotion } from '../../utils/performance';

export default function AuroraBackground() {
    const reduceMotion = shouldReduceMotion();

    // Disable animations on mobile for performance
    const animationProps = reduceMotion ? {} : {
        animate: {
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
        },
        transition: {
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse" as const,
            ease: "easeInOut" as const,
        }
    };

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
                className="absolute inset-0"
            >
                {/* Orb 1 - Primary/Amber */}
                <motion.div
                    {...animationProps}
                    className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-900/20 rounded-full blur-[128px] mix-blend-screen"
                />

                {/* Orb 2 - Emerald/Green */}
                <motion.div
                    {...(!reduceMotion && {
                        animate: {
                            x: [0, -70, 0],
                            y: [0, 100, 0],
                            scale: [1, 1.5, 1],
                        },
                        transition: {
                            duration: 25,
                            repeat: Infinity,
                            repeatType: "reverse" as const,
                            ease: "easeInOut",
                            delay: 2,
                        }
                    })}
                    className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[128px] mix-blend-screen"
                />

                {/* Orb 3 - Blue/Purple (Subtle night sky) */}
                <motion.div
                    {...(!reduceMotion && {
                        animate: {
                            x: [0, 50, 0],
                            y: [0, 50, 0],
                            scale: [1, 1.1, 1],
                        },
                        transition: {
                            duration: 30,
                            repeat: Infinity,
                            repeatType: "reverse" as const,
                            ease: "easeInOut",
                            delay: 5,
                        }
                    })}
                    className="absolute bottom-0 left-1/3 w-[800px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px] mix-blend-screen"
                />

                {/* Noise overlay for texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
            </motion.div>
        </div>
    );
}
