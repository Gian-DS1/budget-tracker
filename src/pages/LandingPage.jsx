import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import ValueBar from '../components/landing/ValueBar';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Showcase from '../components/landing/Showcase';
import HealthScore from '../components/landing/HealthScore';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

import '../styles/landing.css';

/**
 * Landing pública para visitantes no logueados. Vive en `/`. Los CTA
 * navegan al flujo de auth existente (`/acceder`) pasando el modo
 * deseado ('login' | 'signup') por router state. Es dark por sí misma
 * (clase .lp), sin depender del toggle de tema de la app.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  // La landing es siempre dark; forzamos el data-theme mientras está
  // montada y lo restauramos al desmontar para no romper la app interna.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');
    return () => {
      if (prev) root.setAttribute('data-theme', prev);
    };
  }, []);

  const goAuth = (mode = 'login') => {
    navigate('/acceder', { state: { mode } });
  };

  return (
    <div className="lp">
      <div className="lp__shell">
        <Navbar onAuth={goAuth} />
        <main>
          <Hero onAuth={goAuth} />
          <ValueBar />
          <Features />
          <HowItWorks />
          <Showcase />
          <HealthScore />
          <FinalCTA onAuth={goAuth} />
        </main>
        <Footer onAuth={goAuth} />
      </div>
    </div>
  );
}
