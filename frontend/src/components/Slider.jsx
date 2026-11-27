import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, imgUrl } from '../api';

function Fallback() {
  return (
    <section className="hero hero-fallback">
      <div className="container">
        <h1>Fresh Egyptian pizza, hot from the oven</h1>
        <p style={{ color: 'var(--black)' }}>Order for pickup or delivery in a few taps.</p>
        <Link to="/menu" className="btn">See the menu</Link>
      </div>
    </section>
  );
}

export default function Slider() {
  const [slides, setSlides] = useState(null);
  useEffect(() => { api.get('/homepage/slides').then(setSlides).catch(() => setSlides([])); }, []);
  if (slides === null) return <section className="hero hero-fallback"><div className="container">Loading...</div></section>;
  if (slides.length === 0) return <Fallback />;
  return (
    <section className="hero">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={{ delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={slides.length > 1}
        speed={700}
        navigation
        pagination={{ clickable: true }}
      >
        {slides.map((s) => (
          <SwiperSlide key={s.id}>
            <div className={`hero-slide ${s.imageUrl ? '' : 'noimg'}`} style={s.imageUrl ? { backgroundImage: `url(${imgUrl(s.imageUrl)})` } : undefined}>
              <div className="shade" />
              <div className="container">
                <div className="hero-content">
                  {s.badge && <span className="tag">{s.badge}</span>}
                  <h1>{s.title}</h1>
                  {s.description && <p>{s.description}</p>}
                  <Link to={s.buttonLink} className="btn">{s.buttonText}</Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
