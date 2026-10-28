import { config } from "@/lib/config";
import InfoForm from "./InfoForm";

// 02_예약_예약자정보 (할인가는 서버 설정에서 읽어 화면에 넘겨요)
export default function InfoPage() {
  return <InfoForm ewhaPrice={config.ewhaStudentPrice} />;
}
