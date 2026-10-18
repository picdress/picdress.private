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

export type DressMedia = { gallery: string[]; chart?: SizeChart };

const g = (id: string, n: number) => Array.from({ length: n }, (_, i) => `/images/dresses/${id}-${i + 1}.jpg`);

export const DRESS_MEDIA: Record<string, DressMedia> = {
  "green-tinkerbell": {
    gallery: g("green-tinkerbell", 3),
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
