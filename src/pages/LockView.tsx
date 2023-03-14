import BridgeCard from "../components/Cards/BridgeCard";
import TokenCard from "../components/Cards/TokenCard";
import AmountCard from "../components/Cards/AmountCard";
import LockReleaseButton from "../components/Buttons/LockReleaseButton";

const LockView = () => (
  <>
    <BridgeCard />
    <TokenCard />
    <AmountCard />
    <LockReleaseButton />
  </>
);

export default LockView;
