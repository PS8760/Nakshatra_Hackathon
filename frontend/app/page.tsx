"use client";
import { useState, useEffect } from "react";
import Loader from "@/components/landing/Loader";
import Hero from "@/components/landing/Hero";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("nr_loaded")) { setLoading(false); setVisible(true); }
  }, []);

  const handleDone = () => {
    sessionStorage.setItem("nr_loaded", "1");
    setLoading(false);
    setTimeout(() => setVisible(true), 40);
  };

  return (
    <>
      {loading && <Loader onDone={handleDone} />}
      <div style={{ opacity: visible ? 1 : 0, transition: "opacity .5s ease", display: loading ? "none" : "block" }}>
        {/* paddingTop: 0 on Hero — it handles its own top spacing with clamp padding */}
        <Hero />
      </div>
    </>
  );
}
