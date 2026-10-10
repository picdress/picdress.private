import Link from "next/link";
import Accordion from "@/components/Accordion";
import Chevron from "@/components/Chevron";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { fmt } from "@/i18n";
import { getI18n } from "@/i18n/server";
import styles from "./home.module.css";
import HeroSlider from "@/components/HeroSlider";

const HERO_IMAGES = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];
const COLLECTION = [1, 2, 3, 4, 5, 6, 7].map((n) => `/images/collection/${n}.jpg`);
const PARTNER_IMAGES = ["/images/partners/1.jpg", "/images/partners/2.jpg", "/images/partners/3.jpg"];

export default async function Home() {
  const { t } = await getI18n();
  return (
    <>
      <Header />
      <main>
        <div className={styles.hero}>
          <HeroSlider images={HERO_IMAGES} alt={t.home.heroAlt} label={t.home.heroAlt} />
        </div>
        <a href="#about" className={styles.scrollHint} aria-label={t.home.scrollDown}>
          <Chevron width={40} height={18} strokeWidth={1.8} />
        </a>

        <section id="about" className={`${styles.block} ${styles.about}`}>
          <h2 className="title">ABOUT pic.dress</h2>
          <div className={styles.aboutText}>
            {t.home.about.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>

        <section className={`${styles.block} ${styles.program}`}>
          <h2 className="title">TOUR PROGRAM</h2>
          <div className={styles.programBody}>
            <figure className={styles.programItem}>
              <img className={styles.programImg} src="/images/program.jpg" alt="" />
              <figcaption>{t.home.programRental}</figcaption>
            </figure>
            <p className={styles.plus} aria-hidden>
              +
            </p>
            <figure className={styles.programItem}>
              <img className={styles.coupons} src="/images/coupons.png" alt="" />
              <figcaption>{t.home.programCoupons}</figcaption>
            </figure>
          </div>
          <Link href="/reserve" className={btn.primary}>
            {t.home.reserve}
          </Link>
        </section>

        <div className={styles.accordions}>
          <Accordion title="DRESS COLLECTION">
            <div className={styles.collection}>
              {COLLECTION.map((src, i) => (
                <img key={src} src={src} alt={fmt(t.home.collectionAlt, { n: i + 1 })} loading="lazy" />
              ))}
            </div>
          </Accordion>

          <Accordion title="OUR PARTNERS">
            <ul className={styles.partners}>
              {t.home.partners.map((p, i) => (
                <li key={p.name}>
                  <img src={PARTNER_IMAGES[i]} alt="" width={100} height={100} loading="lazy" />
                  <div>
                    <p className="title">{p.name}</p>
                    <p className={styles.partnerDesc}>{p.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Accordion>
        </div>
      </main>
      <Footer />
    </>
  );
}
