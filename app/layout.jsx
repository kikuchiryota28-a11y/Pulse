import "../src/pulse-social.css";
import "../src/pulse-ui-v1.css";
import "../src/pulse-art-direction-v2.css";
import PulseMotion from "./PulseMotion";
import MoveExperienceBridge from "../components/MoveExperienceBridge";
import AuthGate from "../components/AuthGate";
import DeletePulseControl from "../components/DeletePulseControl";
import AccountLauncher from "../components/AccountLauncher";
import Link from "next/link";
import { Home,Compass,Plus,Bell,UserRound } from 'lucide-react';
export const metadata={title:"Pulse — Human action changes what happens next.",description:"A social protocol where people change a shared world."};
function Nav(){return <nav className="pulse-global-nav" aria-label="Primary"><Link href="/" aria-label="Home"><Home size={17}/><span>HOME</span></Link><Link href="/explore" aria-label="Explore"><Compass size={17}/><span>EXPLORE</span></Link><Link className="create" href="/create" aria-label="Create"><Plus size={21}/></Link><Link href="/activity" aria-label="Activity"><Bell size={17}/><span>ACTIVITY</span></Link><Link href="/you" aria-label="You"><UserRound size={17}/><span>YOU</span></Link></nav>}
export default function RootLayout({children}){return <html lang="en"><body><AuthGate><PulseMotion>{children}</PulseMotion><MoveExperienceBridge/><DeletePulseControl/><AccountLauncher/><Nav/></AuthGate></body></html>}
