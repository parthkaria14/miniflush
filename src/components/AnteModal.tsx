import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AnteModal = ({ show, onClose }: { show: boolean; onClose: () => void }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed h-screen w-full z-50 inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-lg p-12 w-full max-w-2xl flex flex-col items-center text-black"
          >
            <img src="/assets/gg.gif" alt="Ante Animation" className="w-56 h-48 mb-8" />
            <div className="text-7xl font-bold text-gray-800 text-center mb-8">
              ANTE
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnteModal; 