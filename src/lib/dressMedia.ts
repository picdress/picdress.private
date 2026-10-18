// 드레스별 상세 사진과 사이즈표 (사장님이 보내준 사이즈표 이미지를 옮겨 적은 값, 단위 cm)
// 블랙벨벳·핑크프롬은 원본이 인치(in)라서 cm로 바꿔 반올림했어요.

export type ChartColumn =
  | "length"
  | "chestFlat"
  | "chestCorset"
  | "waistFlat"
  | "hip"
  | "chest"
  | "waist"
  | "armholeFlat"
  | "sleeveFlat"
  | "sleeveLength";

export type SizeChart = { columns: ChartColumn[]; rows: { size: string; values: (string | number)[] }[] };

export type Tagline = { ko: string; en: string; zh: string };

export type DressMedia = { gallery: string[]; tagline?: Tagline; chart?: SizeChart };

const g = (id: string, n: number) => Array.from({ length: n }, (_, i) => `/images/dresses/${id}-${i + 1}.jpg`);

export const DRESS_MEDIA: Record<string, DressMedia> = {
  "green-tinkerbell": {
    gallery: g("green-tinkerbell", 3),
    tagline: {
      ko: "이화 숲길을 걸을 때마다 사르르 흩날리는 연둣빛 요정 드레스",
      en: "A fairy-green tulle dress that drifts softly with every step along Ewha's forest paths",
      zh: "漫步梨花林间小路，每一步都轻轻飘扬的嫩绿色精灵礼服",
    },
    chart: {
      columns: ["length", "chestCorset", "waistFlat"],
      rows: [
        { size: "XS", values: [130, 37, 30] },
        { size: "S", values: [130, 39, 32] },
        { size: "M", values: [130, 41, 34] },
        { size: "L", values: [130, 43, 36] },
        { size: "XL", values: [130, 45, 38] },
        { size: "2XL", values: [130, 47, 40] },
        { size: "3XL", values: [130, 49, 42] },
      ],
    },
  },
  "black-silk": {
    gallery: g("black-silk", 3),
    tagline: {
      ko: "은은한 광택이 흐르는 블랙 실크, 어깨선과 드레이프만으로 완성되는 우아함",
      en: "Softly gleaming black silk — elegance made of nothing but a shoulder line and a drape",
      zh: "流淌着柔和光泽的黑色丝绸，仅凭肩线与垂褶便尽显优雅",
    },
    chart: {
      columns: ["length", "waistFlat", "chestFlat", "hip"],
      rows: [
        { size: "S", values: [133, 63, 80, 84] },
        { size: "M", values: [133, 66, 84, 88] },
        { size: "L", values: [133, 70, 88, 92] },
        { size: "XL", values: [133, 72, 93, 94] },
      ],
    },
  },
  "white-lace-warmer": {
    gallery: g("white-lace-warmer", 2),
    tagline: {
      ko: "몸선을 따라 흐르는 순백의 실루엣, 걸음마다 영화의 한 장면이 되는 드레스",
      en: "A pure-white silhouette that follows your figure — every step becomes a scene from a film",
      zh: "顺着身形流动的纯白轮廓，每一步都像电影里的一幕",
    },
    chart: {
      columns: ["length", "waistFlat", "chestFlat", "armholeFlat", "sleeveFlat", "sleeveLength"],
      rows: [
        { size: "S", values: ["131~153", 32, 36, 13, 11, 52] },
        { size: "M", values: ["131~153", 34, 37, 13.5, 11.5, 53] },
        { size: "L", values: ["132~154", 35.5, 38, 14, 12, 54] },
        { size: "XL", values: ["132~154", 37, 41, 14, 12, 54] },
      ],
    },
  },
  cinderella: {
    gallery: g("cinderella", 2),
    tagline: {
      ko: "하늘빛 새틴이 퍼지는 순간, 자정까지는 내가 동화 속 주인공",
      en: "The moment the sky-blue satin flares out, you're the fairy-tale heroine until midnight",
      zh: "天蓝色缎面散开的那一刻，午夜之前你就是童话的主角",
    },
    chart: {
      columns: ["length", "waistFlat", "chestFlat"],
      rows: [
        { size: "S", values: [121, 33, 40] },
        { size: "M", values: [122, 35, 42] },
        { size: "L", values: [123, 37, 44] },
      ],
    },
  },
  "pink-prom": {
    gallery: g("pink-prom", 2),
    tagline: {
      ko: "꽃잎처럼 겹겹이 피어나는 핑크 튤, 꿈꾸던 프롬 나잇의 그 드레스",
      en: "Pink tulle blooming layer upon layer like petals — the prom-night dress you've dreamed of",
      zh: "如花瓣层层绽放的粉色薄纱，梦想中的舞会礼服",
    },
    chart: {
      columns: ["chest", "waist", "length"],
      rows: [
        { size: "XS", values: [77, 63, 112] },
        { size: "S", values: [82, 68, 112] },
        { size: "M", values: [87, 73, 112] },
        { size: "L", values: [92, 78, 113] },
        { size: "XL", values: [97, 83, 113] },
      ],
    },
  },
  "black-velvet": {
    gallery: g("black-velvet", 2),
    tagline: {
      ko: "은은하게 빛나는 벨벳에 슬릿 한 줄, 걸을 때 드러나는 시크한 반전",
      en: "Softly lustrous velvet with a single slit — a chic twist revealed as you walk",
      zh: "微微泛光的丝绒配上一道开衩，走动间流露的酷感反差",
    },
    chart: {
      columns: ["chest", "waist", "length"],
      rows: [
        { size: "XS", values: [76, 61, 135] },
        { size: "S", values: [80, 65, 137] },
        { size: "M", values: [84, 69, 139] },
        { size: "L", values: [90, 75, 141] },
        { size: "XL", values: [96, 81, 143] },
      ],
    },
  },
};
