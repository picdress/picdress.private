import Link from "next/link";
import Accordion from "@/components/Accordion";
import Chevron from "@/components/Chevron";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import styles from "./home.module.css";

const COLLECTION = [1, 2, 3, 4, 5, 6, 7].map((n) => `/images/collection/${n}.jpg`);

const PARTNERS = [
  { name: "비빔파스타클럽", desc: "맛있고 재미있고 건강하고 든든한 비빔파스타 전문점", img: "/images/partners/1.jpg" },
  { name: "북카페파오", desc: "푸딩과 커피, 음료, 파스타가\n책과 함께하는\n평화롭고 아늑한 북카페", img: "/images/partners/2.jpg" },
  {
    name: "대현동 프로젝트",
    desc: "샌드위치와 맛있는 커피,\n그리고 누구나 편하게 머물 수 있는 공간을 만들어가는 카페",
    img: "/images/partners/3.jpg",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <div className={styles.hero}>
          <img src="/images/hero.jpg" alt="이화동산에서 드레스를 입은 모습" />
        </div>
        <a href="#about" className={styles.scrollHint} aria-label="아래로">
          <Chevron width={40} height={18} strokeWidth={1.8} />
        </a>

        <section id="about" className={`${styles.block} ${styles.about}`}>
          <h2 className="title">ABOUT pic.dress</h2>
          <div className={styles.aboutText}>
            <p>
              pic.dress는 이대 상권의 활성화를 꿈꾸며 탄생한
              <br />
              드레스 투어 상품입니다.
            </p>
            <p>
              드레스를 입고 캠퍼스를 거닐며 사진을 남기고,
              <br />
              이대만의 특별한 맛집과 카페를 방문해보세요.
            </p>
            <p>이화에서만 만날 수 있는 특별한 드레스 투어를 pic.dress와 함께 즐겨보세요.</p>
          </div>
        </section>

        <section className={`${styles.block} ${styles.program}`}>
          <h2 className="title">TOUR PROGRAM</h2>
          <div className={styles.programBody}>
            <figure className={styles.programItem}>
              <img className={styles.programImg} src="/images/program.jpg" alt="드레스 대여" />
              <figcaption>드레스 대여 2시간 (드레스 선택 가능)</figcaption>
            </figure>
            <p className={styles.plus} aria-hidden>
              +
            </p>
            <figure className={styles.programItem}>
              <div className={styles.coupons}>
                <img className={styles.c2} src="/images/coupon-2.png" alt="" />
                <img className={styles.c1} src="/images/coupon-1.png" alt="" />
                <img className={styles.c3} src="/images/coupon-3.png" alt="" />
              </div>
              <figcaption>제휴 음식점/카페 쿠폰 3장 제공</figcaption>
            </figure>
          </div>
          <Link href="/reserve" className={btn.primary}>
            예약하기
          </Link>
        </section>

        <div className={styles.accordions}>
          <Accordion title="DRESS COLLECTION">
            <div className={styles.collection}>
              {COLLECTION.map((src, i) => (
                <img key={src} src={src} alt={`드레스 컬렉션 ${i + 1}`} loading="lazy" />
              ))}
            </div>
          </Accordion>

          <Accordion title="OUR PARTNERS">
            <ul className={styles.partners}>
              {PARTNERS.map((p) => (
                <li key={p.name}>
                  <img src={p.img} alt="" width={100} height={100} loading="lazy" />
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
