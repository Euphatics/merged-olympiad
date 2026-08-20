import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Picture } from '../../../components/ui';
import { CheckCircle2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Locally hosted, NTI-branded banners.
 *
 * These were previously hotlinked from flowbite.com's documentation — generic
 * demo placeholders served from a third party, which the site's
 * Content-Security-Policy blocks and which could change or disappear without
 * notice.
 */
const HERO_SLIDES = [
  { src: '/nti_register_banner.png', alt: 'Registration open for the NTI Olympiad 2026–27' },
  { src: '/about_nti_banner.png', alt: 'About the National Talent Identification Olympiad' },
  { src: '/how_to_register.png', alt: 'How schools and students register for the NTI Olympiad' }
];

const SLIDE_INTERVAL_MS = 6000;

export default function HomeHero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  useEffect(() => {
    // Respect a reduced-motion preference, and hold still while the visitor is
    // interacting with the carousel.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isPaused || prefersReducedMotion) return undefined;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <section className="w-full bg-[#f9fafb] py-6 lg:py-8 border-b border-gray-200">
      <Helmet>
        <title>NTI Olympiad – Academic Excellence Starts Here</title>
        <meta name="description" content="NTI Olympiad – India's premier academic competition platform for students from Class 1 to Class 10." />
        <link rel="canonical" href="https://ntiolympiad.in/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="NTI Olympiad – Academic Excellence Starts Here" />
        <meta property="og:description" content="NTI Olympiad – India's premier academic competition platform for students from Class 1 to Class 10." />
        <meta property="og:site_name" content="NTI Olympiad" />
        <meta property="og:image" content="https://ntiolympiad.in/about_nti_banner.png" />
        <meta property="og:url" content="https://ntiolympiad.in/" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NTI Olympiad – Academic Excellence Starts Here" />
        <meta name="twitter:description" content="NTI Olympiad – India's premier academic competition platform for students from Class 1 to Class 10." />
        <meta name="twitter:image" content="https://ntiolympiad.in/about_nti_banner.png" />

        {/* WebSite Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "NTI Olympiad",
            "url": "https://ntiolympiad.in/"
          })}
        </script>

        {/* EducationalOrganization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "National Talent Identification Olympiad (NTI)",
            "alternateName": "NTI Olympiad",
            "url": "https://ntiolympiad.in/",
            "logo": "https://ntiolympiad.in/favicon.svg",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+91-7972621561",
              "contactType": "customer service",
              "email": "info@ntiolympiad.in",
              "areaServed": "IN"
            },
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Mumbai",
              "addressRegion": "Maharashtra",
              "addressCountry": "IN"
            },
            "sameAs": [
              "https://www.facebook.com/ntiolympiad",
              "https://www.instagram.com/ntiolympiad",
              "https://twitter.com/ntiolympiad"
            ]
          })}
        </script>
      </Helmet>
      <div className="w-full px-6 sm:px-10 lg:px-16">
        
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch w-full">
          
          {/* SLIDESHOW */}
          <div
            className="w-full lg:col-span-7 h-[250px] sm:h-[350px] lg:h-[520px] xl:h-[560px] rounded-none overflow-hidden shadow-sm border border-gray-200 relative bg-gray-100 group"
            role="region"
            aria-roledescription="carousel"
            aria-label="NTI Olympiad highlights"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={() => setIsPaused(false)}
          >
            {HERO_SLIDES.map((slide, index) => (
              <Picture
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                // The first slide is the largest-contentful-paint element, so it
                // loads eagerly at high priority; the rest wait.
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                aria-hidden={index !== currentSlide}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}

            {/* Left Arrow — kept reachable by keyboard rather than hover-only. */}
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-300 hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
              aria-label="Previous slide"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Right Arrow */}
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-300 hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
              aria-label="Next slide"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1} of ${HERO_SLIDES.length}`}
                  aria-current={index === currentSlide}
                  className={`w-3 h-3 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 ${index === currentSlide ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: INFORMATION & CTA */}
          <div className="w-full lg:col-span-5 flex flex-col justify-center pt-4 lg:pt-0 lg:pl-6">
            <div className="inline-block px-3.5 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full mb-4 w-fit uppercase tracking-wider">
              NTI Olympiad 2026-27
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-bold text-gray-900 leading-[1.15] mb-5 tracking-tight">
              Compete. Learn. Excel. Join <span className="text-[#007BFF]">NTI Olympiad</span> 2026–27.
            </h1>
            
            <ul className="space-y-3.5 mb-8">
              {[
                'Open to students from Classes 1–10',
                'School and Individual Registration',
                'Mathematics, Science, English, IT & Finance Olympiads',
                'Offline examination across India',
                'Digital certificates and merit recognition',
                'Performance reports for students and schools'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-[#007BFF] flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-[15px] sm:text-[16px] lg:text-[17px] text-gray-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="flex items-center justify-center gap-2 bg-[#007BFF] text-white px-6 py-3.5 rounded-xl font-bold hover:bg-[#0056b3] transition-colors shadow-lg shadow-blue-500/30 text-[15px]">
                Register Now
                <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
              <Link to="/syllabus-pyqs" className="flex items-center justify-center gap-2 bg-white text-gray-700 border-2 border-gray-200 px-6 py-3.5 rounded-xl font-bold hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm text-[15px]">
                Explore Olympiads
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

