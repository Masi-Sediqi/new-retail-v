import { useEffect, useState } from "react";
import backgroundImage from "../assets/Background.png";
import logoImage from "../assets/logo.jpeg";
import "./StartupSplash.css";

const DISPLAY_TIME_MS = 3000;
const FADE_TIME_MS = 900;

function StartupSplash() {
  const [isMounted, setIsMounted] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setIsImageReady(true);
    image.onerror = () => setIsImageReady(true);
    image.src = backgroundImage;

    const fadeTimer = window.setTimeout(() => {
      setIsClosing(true);
    }, DISPLAY_TIME_MS);

    const removeTimer = window.setTimeout(() => {
      setIsMounted(false);
    }, DISPLAY_TIME_MS + FADE_TIME_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  if (!isMounted) return null;

  return (
    <section
      className={`startup-splash${isClosing ? " startup-splash-closing" : ""}`}
      aria-hidden="true"
    >
      <div
        className={`startup-splash-background${isImageReady ? " startup-splash-background-ready" : ""}`}
      >
        <div className="startup-splash-track">
          <div
            className="startup-splash-tile"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div
            className="startup-splash-tile"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        </div>
      </div>

      <div className="startup-splash-overlay" />

      <div className="startup-splash-content">
        <div className="startup-splash-logo">
          <img src={logoImage} alt="" />
        </div>
        <span>POWERED BY</span>
        <strong>AFGHAN POWER</strong>
        <p>Asset & Inventory Management</p>
        <div className="startup-splash-line">
          <i />
        </div>
      </div>
    </section>
  );
}

export default StartupSplash;
