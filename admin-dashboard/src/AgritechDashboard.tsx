import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, Satellite, ArrowRight, BrainCircuit, Globe, 
  Database, ShieldCheck, CheckCircle2, Factory, HandCoins, Sprout,
  Droplets, Users, Sun, TrendingUp, Bug
} from 'lucide-react';

export default function AgritechDashboard() {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('NGOs');

  const primaryTeal = '#095353';
  const darkerTeal = '#064242';
  const lightGreen = '#A3D063';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: primaryTeal, fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#fff', overflowX: 'hidden' }}>
      
      {/* ── HEADER WITH DROPDOWN ── */}
      <header style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 4rem', 
        background: scrolled ? 'rgba(9, 83, 83, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${lightGreen}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '14px', height: '14px', background: lightGreen, borderRadius: '50%', borderTopRightRadius: 0 }} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>Krishi-Drishti</span>
        </div>

        <nav style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
          <div 
            style={{ position: 'relative' }} 
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <a href="#" style={{ color: lightGreen, borderBottom: `2px solid ${lightGreen}`, paddingBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
              SOLUTIONS
            </a>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  style={{ position: 'absolute', top: '100%', left: 0, paddingTop: '1rem', width: '240px' }}
                >
                  <div style={{ background: '#fff', borderRadius: '8px', padding: '1rem 0', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    {['Project Partners', 'Carbon Credit Buyers', 'Growers'].map((item) => (
                      <a key={item} href="#" style={{ display: 'block', padding: '0.75rem 1.5rem', color: '#1E293B', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = primaryTeal; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1E293B'; }}>
                        {item}
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {['SCIENCE & TECH', 'PROJECTS', 'INSIGHTS', 'ABOUT US'].map((item, i) => (
            <a key={i} href="#" style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = lightGreen} onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}>
              {item}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button style={{ padding: '0.6rem 2rem', borderRadius: '50px', background: lightGreen, border: 'none', color: primaryTeal, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
            Contact Us
          </button>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', padding: '0 6rem' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=2000&auto=format&fit=crop" alt="Aerial Farm" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(9, 83, 83, 0.8) 0%, rgba(9, 83, 83, 0.4) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(9, 83, 83, 1) 0%, transparent 20%)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ position: 'relative', zIndex: 10, maxWidth: '1000px' }}>
          <div style={{ color: lightGreen, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>WHAT WE DO</div>
          <h1 style={{ fontSize: '4.5rem', fontWeight: 600, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            Krishi-Drishti uses remote sensing technology to measure soil carbon and scale projects worldwide that restore soils and remove carbon.
          </h1>
        </motion.div>
      </section>

      {/* ── LOGO BANNER ── */}
      <section style={{ background: `linear-gradient(90deg, ${lightGreen} 0%, #38BDF8 100%)`, padding: '4rem 6rem', display: 'flex', alignItems: 'center', gap: '4rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>Our partners</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', opacity: 0.9 }}>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>ISRO Space</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>Earth Engine</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>CBAM Registry</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>Gemini AI</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>Stripe Climate</div>
        </div>
      </section>

      {/* ── CARBON MATH EQUATION ── */}
      <section style={{ padding: '8rem 6rem', background: darkerTeal }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
            Krishi-Drishti's High-Integrity Carbon Removal Credits
          </h2>
          <p style={{ fontSize: '1.25rem', color: '#E2E8F0', marginBottom: '6rem', maxWidth: '800px', margin: '0 auto 6rem' }}>
            Not all carbon credits are created equal. With carbon avoidance credits, emitted carbon remains in the atmosphere. <strong>Carbon removal credits</strong> are the only way to truly remove emissions and achieve net zero.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem' }}>
            {/* Avoidance Math */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', opacity: 0.5 }}>
               <div style={{ border: '2px solid #fff', padding: '2rem', borderRadius: '8px', borderTopWidth: '16px' }}><div style={{color:'#fff', fontWeight:600}}>1 tonne<br/>CO2 emitted</div></div>
               <div style={{color:'#fff', fontSize: '3rem'}}>+</div>
               <div style={{ border: '2px dashed #fff', padding: '2rem', borderRadius: '8px', borderTopWidth: '16px' }}><div style={{color:'#fff', fontWeight:600}}>1 tonne<br/>CO2 avoided</div></div>
               <div style={{color:'#fff', fontSize: '3rem'}}>=</div>
               <div style={{ border: '2px solid #fff', padding: '2rem', borderRadius: '8px', borderTopWidth: '16px' }}><div style={{color:'#fff', fontWeight:600}}>1 tonne<br/>CO2 emitted</div></div>
            </div>
            <div style={{ width: '2px', height: '150px', background: 'rgba(255,255,255,0.2)' }} />
            {/* Removal Math */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
               <div style={{ border: '2px solid #fff', padding: '2rem', borderRadius: '8px', borderTopWidth: '16px' }}><div style={{color:'#fff', fontWeight:600}}>1 tonne<br/>CO2 emitted</div></div>
               <div style={{color:'#fff', fontSize: '3rem'}}>+</div>
               <div style={{ background: lightGreen, padding: '2rem', borderRadius: '8px', borderTopWidth: '16px', borderTopColor: '#65a30d', borderTopStyle: 'solid' }}><div style={{color:primaryTeal, fontWeight:700}}>1 tonne<br/>CO2 removed</div></div>
               <div style={{color:'#fff', fontSize: '3rem'}}>=</div>
               <div style={{color:'#fff', fontSize: '6rem', fontWeight:800, lineHeight: 0.8}}>0<div style={{fontSize:'1.25rem', fontWeight:500, marginTop: '0.5rem'}}>net-zero CO2</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE CHAIN INFOGRAPHIC ── */}
      <section style={{ padding: '8rem 6rem', background: primaryTeal, position: 'relative', overflow: 'hidden' }}>
        {/* Background blobs for Boomitra style */}
        <div style={{ position: 'absolute', width: '1000px', height: '1000px', background: 'radial-gradient(circle, rgba(163,208,99,0.15) 0%, transparent 60%)', top: '-500px', left: '-200px', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(163,208,99,0.1) 0%, transparent 60%)', bottom: '-400px', right: '-100px', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '4rem' }}>
            
            {/* 1. Farmer Icon */}
            <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <Users size={80} color="#fff" strokeWidth={1.5} />
                <Sprout size={50} color="#fff" strokeWidth={1.5} style={{ marginBottom: '10px' }} />
              </div>
            </div>

            {/* 2. Left Arrows & Text */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 2rem' }}>
              <p style={{ textAlign: 'center', color: '#fff', fontSize: '1rem', fontWeight: 500, marginBottom: '1rem', minHeight: '60px', maxWidth: '400px' }}>
                Partners equip farmers and ranchers to adopt improved land management practices, which increase soil carbon.
              </p>
              
              <svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none">
                <path d="M0 30 Q 150 -10 290 30" stroke="#fff" strokeWidth="3" fill="none" />
                <path d="M280 20 L295 33 L275 40" stroke="#fff" strokeWidth="3" fill="none" />
              </svg>
              
              <div style={{ position: 'relative', width: '100%', height: '40px', marginTop: '1.5rem' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 40" preserveAspectRatio="none">
                  <path d="M300 10 Q 150 50 10 10" stroke="#fff" strokeWidth="3" fill="none" />
                  <path d="M20 20 L5 8 L25 0" stroke="#fff" strokeWidth="3" fill="none" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '4px', marginTop: '-5px' }}>$$$</span>
                </div>
              </div>

              <p style={{ textAlign: 'center', color: '#fff', fontSize: '1rem', fontWeight: 500, marginTop: '1rem', minHeight: '60px', maxWidth: '400px' }}>
                Farmers and partners receive the vast majority of every carbon credit sold.
              </p>
            </div>

            {/* 3. Krishi-Drishti Logo */}
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '0 1rem' }}>
               <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: `3px solid ${lightGreen}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div style={{ width: '32px', height: '32px', background: lightGreen, borderRadius: '50%', borderTopRightRadius: 0 }} />
               </div>
               <span style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Krishi-Drishti</span>
            </div>

            {/* 4. Right Arrows & Text */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 2rem', position: 'relative' }}>
              
              {/* SATELLITE (Positioned over right arrows) */}
              <div style={{ position: 'absolute', top: '-180px', right: '-20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Satellite size={80} color={lightGreen} style={{ transform: 'rotate(15deg)' }} strokeWidth={1.5} />
                <div style={{ color: lightGreen, fontSize: '0.875rem', textAlign: 'center', fontWeight: 600, width: '150px', marginTop: '1rem' }}>
                  Proprietary AI and Remote Sensing Technology
                </div>
                {/* Dotted laser beam */}
                <svg width="100" height="150" viewBox="0 0 100 150" fill="none" style={{ position: 'absolute', top: '70px', left: '-50px', zIndex: -1 }}>
                   <path d="M80 0 L0 150 M80 0 L40 150" stroke={lightGreen} strokeWidth="2" strokeDasharray="5,5" opacity="0.4" />
                </svg>
              </div>

              <p style={{ textAlign: 'center', color: '#fff', fontSize: '1rem', fontWeight: 500, marginBottom: '1rem', minHeight: '60px', maxWidth: '400px' }}>
                Krishi-Drishti quantifies the increase in soil carbon with satellite and AI technology to generate third-party verified carbon removal credits.
              </p>
              
              <svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none">
                <path d="M0 30 Q 150 -10 290 30" stroke="#fff" strokeWidth="3" fill="none" />
                <path d="M280 20 L295 33 L275 40" stroke="#fff" strokeWidth="3" fill="none" />
              </svg>
              
              <div style={{ position: 'relative', width: '100%', height: '40px', marginTop: '1.5rem' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 40" preserveAspectRatio="none">
                  <path d="M300 10 Q 150 50 10 10" stroke="#fff" strokeWidth="3" fill="none" />
                  <path d="M20 20 L5 8 L25 0" stroke="#fff" strokeWidth="3" fill="none" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '4px', marginTop: '-5px' }}>$$$$</span>
                </div>
              </div>

              <p style={{ textAlign: 'center', color: '#fff', fontSize: '1rem', fontWeight: 500, marginTop: '1rem', minHeight: '60px', maxWidth: '400px' }}>
                Organizations purchase carbon credits to offset their carbon emissions and reach their sustainability goals.
              </p>
            </div>

            {/* 5. Organizations Icon */}
            <div style={{ flex: '0 0 120px', display: 'flex', justifyContent: 'center' }}>
              <Factory size={100} color="#fff" strokeWidth={1.5} />
            </div>

          </div>
        </div>
      </section>

      {/* ── TYPES OF PARTNERSHIPS (TABBED LAYOUT) ── */}
      <section style={{ padding: '8rem 6rem', background: darkerTeal }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Types of Partnerships</h2>
          <p style={{ fontSize: '1.25rem', color: '#E2E8F0', marginBottom: '4rem' }}>Let's build a resilient, equitable world together.</p>
          
          <div style={{ display: 'flex', gap: '3rem', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '4rem' }}>
            {['NGOs', 'Farming Organizations', 'Agribusinesses', 'CPG Companies'].map(tab => (
              <div key={tab} onClick={() => setActiveTab(tab)} style={{ color: activeTab === tab ? lightGreen : '#fff', paddingBottom: '1rem', borderBottom: activeTab === tab ? `3px solid ${lightGreen}` : '3px solid transparent', fontSize: '1.125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                {tab}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem' }}>
             <div>
               <p style={{ fontSize: '1.25rem', color: '#E2E8F0', lineHeight: 1.6 }}>
                 Krishi-Drishti partners with {activeTab} around the world to help producers improve their lands and increase soil productivity. Our inclusive approach gives farmers, ranchers, and landowners of all sizes access to carbon finance. By working together, we can support local communities and build resilient ecosystems in the face of climate change.
               </p>
               <button style={{ background: 'transparent', border: `2px solid ${lightGreen}`, color: lightGreen, padding: '0.75rem 2rem', borderRadius: '50px', fontSize: '1rem', fontWeight: 600, marginTop: '2rem', cursor: 'pointer' }}>Learn More</button>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <p style={{ fontSize: '1.125rem', color: '#E2E8F0', lineHeight: 1.6 }}>
                 <strong style={{ color: lightGreen }}>Implementation Goal:</strong> Facilitating direct carbon finance to smallholder farmers by utilizing edge AI diagnostics combined with remote sensing.
               </p>
               <p style={{ fontSize: '1.125rem', color: '#E2E8F0', lineHeight: 1.6 }}>
                 <strong style={{ color: lightGreen }}>Partnership Vision:</strong> Integrating with regional farming cooperatives to deploy decentralized disease detection, minimizing crop loss and maximizing SOC potential.
               </p>
             </div>
          </div>
        </div>
      </section>

      {/* ── WHITE FEATURE CARDS ── */}
      <section style={{ padding: '8rem 6rem', background: primaryTeal }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4rem', maxWidth: '800px' }}>
            Our soil carbon <span style={{ borderBottom: `4px solid ${lightGreen}` }}>removal</span> projects have been third-party validated to ensure:
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {[
              { icon: ShieldCheck, title: 'Permanence', desc: 'We manage reversals with layered safeguards: long-term monitoring, independent verification, and conservative buffer contributions that are never sold.' },
              { icon: Database, title: 'Accurate Measurement', desc: 'Our digital MRV quantifies removals by fusing remote sensing with massive georeferenced soil-sample datasets, then reports uncertainty with conservative deductions.' },
              { icon: Leaf, title: 'Additionality', desc: 'Credits are issued only when farmers implement verified practice changes that exceed baseline management. Third-party verification confirms the change before issuance.' }
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} style={{ background: '#fff', borderRadius: '16px', padding: '3rem 2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.04 }}><card.icon size={200} color={primaryTeal} /></div>
                <div style={{ position: 'relative', zIndex: 2, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '12px', background: '#F1F5F9' }}><card.icon size={32} color={lightGreen} /></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: primaryTeal, marginBottom: '1rem' }}>{card.title}</h3>
                <p style={{ fontSize: '1.125rem', color: '#475569', lineHeight: 1.6 }}>{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* ── VERTICAL TIMELINE LAYOUT (SCIENCE & TECH) ── */}
      <section style={{ position: 'relative', padding: '8rem 0', background: primaryTeal }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: lightGreen, zIndex: 0 }} />
        {/* Timeline Step 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0 1fr', gap: '4rem', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', marginBottom: '8rem', position: 'relative' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ paddingRight: '2rem' }}>
            <div style={{ color: lightGreen, fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>SCIENCE AND TECH</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>Measuring Soil Carbon</h2>
            <p style={{ fontSize: '1.125rem', color: '#E2E8F0', lineHeight: 1.6 }}>Krishi-Drishti quantifies soil carbon with digital MRV that fuses multi-satellite imagery (Google Earth Engine) and AI with georeferenced soil samples. The system delivers continuous monitoring and produces field-level SOC measurements.</p>
          </motion.div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: lightGreen, position: 'absolute', zIndex: 10, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ paddingLeft: '2rem' }}>
            <img src="/sat.jpg" alt="Satellite Imagery" style={{ width: '100%', borderRadius: '12px' }} />
          </motion.div>
        </div>
        {/* Timeline Step 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0 1fr', gap: '4rem', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', marginBottom: '8rem', position: 'relative' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ paddingRight: '2rem' }}>
            <img src="/ai.jpg" alt="AI Diagnostics" style={{ width: '100%', borderRadius: '12px' }} />
          </motion.div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: lightGreen, position: 'absolute', zIndex: 10, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ paddingLeft: '2rem' }}>
            <div style={{ color: lightGreen, fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>EDGE INFERENCE</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>Partnering for Regeneration</h2>
            <p style={{ fontSize: '1.125rem', color: '#E2E8F0', lineHeight: 1.6 }}>Using YOLOv8 and Gemini Flash on mobile devices, farmers instantly identify pathogens and receive regenerative treatment protocols. Healthier soils lead to carbon finance flowing back to land stewards.</p>
          </motion.div>
        </div>
      </section>

      {/* ── 3D MODEL CALIBRATION INFOGRAPHIC ── */}
      <section style={{ background: darkerTeal, padding: '8rem 6rem', display: 'flex' }}>
        <div style={{ flex: '0 0 45%', paddingRight: '4rem' }}>
          <h2 style={{ fontSize: '3rem', color: '#fff', fontWeight: 600, marginBottom: '2rem', letterSpacing: '-0.02em' }}>Model Inference & Edge AI</h2>
          <p style={{ fontSize: '1.25rem', color: '#E2E8F0', lineHeight: 1.6, marginBottom: '2rem' }}>Krishi-Drishti matches satellite MRV data with on-ground visual inference to create highly accurate agronomic models.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#E2E8F0', fontSize: '1.25rem', lineHeight: 1.8 }}>
             <li><strong style={{color: lightGreen}}>Step 1:</strong> YOLOv8 hardware-accelerated cropping.</li>
             <li><strong style={{color: lightGreen}}>Step 2:</strong> Gemini 2.5 Flash pathological analysis.</li>
             <li><strong style={{color: lightGreen}}>Step 3:</strong> Verification against NDVI bands.</li>
          </ul>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', width: '100%', height: '400px', transformStyle: 'preserve-3d', perspective: '1000px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotateX(60deg) rotateZ(-35deg)', transformStyle: 'preserve-3d', width: '400px', height: '300px' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', border: `2px solid ${lightGreen}`, borderRadius: '12px', transform: 'translateZ(120px)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrainCircuit size={64} color={lightGreen} style={{ opacity: 0.8 }} /></div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,0,0,0.4), rgba(255,255,0,0.4), rgba(0,255,0,0.4))', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', transform: 'translateZ(60px)' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/sat.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', transform: 'translateZ(0px)', opacity: 0.8 }} />
              <div style={{ position: 'absolute', top: '50%', left: '30%', width: '2px', height: '120px', background: '#fff', transform: 'translateZ(0px) rotateX(-90deg)', transformOrigin: 'top' }}>
                <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', position: 'absolute', top: 0, left: '-3px' }} />
                <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '60px', left: '-3px' }} />
                <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '120px', left: '-3px' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RADIAL BENEFIT WHEEL ── */}
      <section style={{ padding: '8rem 6rem', background: primaryTeal }}>
        <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>Co-Benefits at Scale</h2>
        </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 500px 1fr', gap: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', textAlign: 'right' }}>
            <div><h4 style={{color: lightGreen, fontSize:'1.25rem', marginBottom:'0.5rem'}}>Economic:</h4><ul style={{color:'#E2E8F0', listStyle:'none', padding:0, lineHeight:1.8}}><li>Boost farm income</li><li>Create jobs and security</li></ul></div>
            <div><h4 style={{color: lightGreen, fontSize:'1.25rem', marginBottom:'0.5rem'}}>Social:</h4><ul style={{color:'#E2E8F0', listStyle:'none', padding:0, lineHeight:1.8}}><li>Empower local communities</li><li>Achieve food security</li></ul></div>
            <div><h4 style={{color: lightGreen, fontSize:'1.25rem', marginBottom:'0.5rem'}}>Atmosphere:</h4><ul style={{color:'#E2E8F0', listStyle:'none', padding:0, lineHeight:1.8}}><li>Combat climate change</li><li>Improve air quality</li></ul></div>
          </div>
          <div style={{ width: '500px', height: '500px', borderRadius: '50%', background: lightGreen, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `16px solid ${primaryTeal}` }}>
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: primaryTeal, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}><Leaf size={80} color={lightGreen} /></div>
            <TrendingUp size={48} color={primaryTeal} style={{ position: 'absolute', top: '15%', left: '25%' }} />
            <Users size={48} color={primaryTeal} style={{ position: 'absolute', top: '45%', left: '10%' }} />
            <Sun size={48} color={primaryTeal} style={{ position: 'absolute', bottom: '15%', left: '25%' }} />
            <Bug size={48} color={primaryTeal} style={{ position: 'absolute', top: '15%', right: '25%' }} />
            <Sprout size={48} color={primaryTeal} style={{ position: 'absolute', top: '45%', right: '10%' }} />
            <Droplets size={48} color={primaryTeal} style={{ position: 'absolute', bottom: '15%', right: '25%' }} />
            <div style={{ position: 'absolute', width: '2px', height: '100%', background: primaryTeal, transform: 'rotate(0deg)' }} />
            <div style={{ position: 'absolute', width: '2px', height: '100%', background: primaryTeal, transform: 'rotate(60deg)' }} />
            <div style={{ position: 'absolute', width: '2px', height: '100%', background: primaryTeal, transform: 'rotate(120deg)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', textAlign: 'left' }}>
            <div><h4 style={{color: lightGreen, fontSize:'1.25rem', marginBottom:'0.5rem'}}>Natural Life:</h4><ul style={{color:'#E2E8F0', listStyle:'none', padding:0, lineHeight:1.8}}><li>Preserve biodiversity</li><li>Create flourishing habitats</li></ul></div>
            <div><h4 style={{color: lightGreen, fontSize:'1.25rem', marginBottom:'0.5rem'}}>Land:</h4><ul style={{color:'#E2E8F0', listStyle:'none', padding:0, lineHeight:1.8}}><li>Restore degraded lands</li><li>Build soil health</li></ul></div>
            <div><h4 style={{color: lightGreen, fontSize:'1.25rem', marginBottom:'0.5rem'}}>Water:</h4><ul style={{color:'#E2E8F0', listStyle:'none', padding:0, lineHeight:1.8}}><li>Improve water quality</li><li>Enhance soil water retention</li></ul></div>
          </div>
        </div>
      </section>

      {/* ── METHODOLOGY DATA TABLE ── */}
      <section style={{ padding: '8rem 6rem', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 600, color: primaryTeal, letterSpacing: '-0.02em', marginBottom: '4rem' }}>Targeted Methodologies for Integration</h2>
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#0F172A', color: '#fff' }}>
                  <th style={{ padding: '1.5rem', textAlign: 'left', fontWeight: 600 }}>Methodology</th>
                  <th style={{ padding: '1.5rem', fontWeight: 600 }}>Year Published</th>
                  <th style={{ padding: '1.5rem', fontWeight: 600 }}>Practice Monitoring</th>
                  <th style={{ padding: '1.5rem', fontWeight: 600 }}>SOC Measurement</th>
                  <th style={{ padding: '1.5rem', fontWeight: 600 }}>GHG Modeling</th>
                </tr>
              </thead>
              <tbody style={{ color: '#1E293B', fontSize: '1rem', fontWeight: 500 }}>
                {[
                  ['VCS VM0042: Improved Agricultural Land Management v2.0', '2023', true, true, true],
                  ['CAR U.S. Soil Enrichment Protocol v1.1', '2022', true, true, true],
                  ['VCS VM0026: Sustainable Grassland Management v1.1', '2021', true, false, false],
                  ['Gold Standard Soil Organic Carbon Framework v1.0', '2020', true, false, false],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <td style={{ padding: '1.5rem', textAlign: 'left' }}>{row[0]}</td>
                    <td style={{ padding: '1.5rem' }}>{row[1]}</td>
                    <td style={{ padding: '1.5rem' }}><span style={{ background: row[2] ? lightGreen : '#FBBF24', color: row[2] ? '#fff' : '#000', padding: '0.4rem 1.5rem', borderRadius: '50px', display: 'inline-block' }}>{row[2] ? 'Yes' : 'No'}</span></td>
                    <td style={{ padding: '1.5rem' }}><span style={{ background: row[3] ? lightGreen : '#FBBF24', color: row[3] ? '#fff' : '#000', padding: '0.4rem 1.5rem', borderRadius: '50px', display: 'inline-block' }}>{row[3] ? 'Yes' : 'No'}</span></td>
                    <td style={{ padding: '1.5rem' }}><span style={{ background: row[4] ? lightGreen : '#FBBF24', color: row[4] ? '#fff' : '#000', padding: '0.4rem 1.5rem', borderRadius: '50px', display: 'inline-block' }}>{row[4] ? 'Yes' : 'No'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── RELATED ARTICLES BLOG CARDS ── */}
      <section style={{ padding: '8rem 6rem', background: darkerTeal }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4rem' }}>Technical Resources</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {[
              { title: 'Architecture Deep Dive: Edge AI & YOLOv8 on Mobile', date: 'Upcoming Release', author: 'Engineering', img: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=600&auto=format&fit=crop' },
              { title: 'Whitepaper: Bio-Acoustic Monitoring for Biodiversity Tracking', date: 'Upcoming Release', author: 'Research', img: 'https://images.unsplash.com/photo-1594771804886-a933bb2d609b?q=80&w=600&auto=format&fit=crop' },
              { title: 'Technical Overview: Smart Contracts for the Carbon Ledger', date: 'Upcoming Release', author: 'Blockchain', img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=600&auto=format&fit=crop' }
            ].map((blog, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                 <img src={blog.img} style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '16px', marginBottom: '1.5rem' }} />
                 <div style={{ color: lightGreen, fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>{blog.date}</div>
                 <h3 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 600, lineHeight: 1.4, marginBottom: '1.5rem' }}>{blog.title}</h3>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
                   <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} color="#fff" /></div>
                   <div style={{ color: '#fff', fontSize: '0.875rem' }}>Krishi-Drishti {blog.author}</div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY HERO (WITH CURVE) ── */}
      <section style={{ position: 'relative', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
           <img src="https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=2000&auto=format&fit=crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 83, 83, 0.7)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px', padding: '0 2rem' }}>
           <h2 style={{ fontSize: '3rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '2rem' }}>
             We are an experienced team that values transparency and dialogue with our partners and farmers.
           </h2>
           <button style={{ background: lightGreen, color: primaryTeal, padding: '1rem 3rem', borderRadius: '50px', border: 'none', fontSize: '1.125rem', fontWeight: 700, cursor: 'pointer' }}>
             Learn More
           </button>
        </div>
        <svg viewBox="0 0 1440 320" style={{ position: 'absolute', bottom: -5, left: 0, width: '100%', height: 'auto', zIndex: 10 }}>
          <path fill={primaryTeal} fillOpacity="1" d="M0,224L120,224C240,224,480,224,720,245.3C960,267,1200,309,1320,330.7L1440,352L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
        </svg>
      </section>

      {/* ── SPLIT SCREEN CTA ── */}
      <section style={{ display: 'flex', height: '600px' }}>
        <div style={{ flex: 1, background: primaryTeal, padding: '6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: lightGreen, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>FOR PROJECT PARTNERS</div>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 600, color: '#fff', marginBottom: '2rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Unlocking the power of agriculture to reverse climate change.
          </h2>
          <p style={{ fontSize: '1.25rem', color: '#E2E8F0', marginBottom: '3rem', maxWidth: '500px' }}>
            Partner with us to improve agricultural practices and create equitable opportunities for landowners through Krishi-Drishti's trusted carbon marketplace.
          </p>
          <button style={{ background: lightGreen, color: primaryTeal, padding: '1rem 3rem', borderRadius: '50px', border: 'none', width: 'fit-content', fontSize: '1.125rem', fontWeight: 700, cursor: 'pointer' }}>
            Get Started
          </button>
        </div>
        <div style={{ flex: 1, backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1500&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#021818', padding: '4rem 6rem', color: '#94A3B8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${lightGreen}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '12px', height: '12px', background: lightGreen, borderRadius: '50%', borderTopRightRadius: 0 }} />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Krishi-Drishti</span>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
             <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Privacy Policy</a>
             <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Terms of Service</a>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
          © 2026 Krishi-Drishti Infrastructure. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
