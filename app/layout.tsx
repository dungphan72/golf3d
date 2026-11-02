import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Golf3D — Play. Connect. Repeat.',description:'Không gian golf 3D tại Bình Trưng. Đặt line, trải nghiệm và quản lý cơ sở.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
