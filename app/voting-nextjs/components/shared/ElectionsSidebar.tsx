// 'use client';

// import { useState } from 'react';
// import { usePathname } from 'next/navigation';
// import Link from 'next/link';
// import {
//     Vote,
//     ClipboardList,
//     CheckCircle2,
//     UserCheck,
//     ChevronLeft,
//     ChevronRight,
//     Home
// } from 'lucide-react';
// import { useWallet } from '@solana/wallet-adapter-react';

// export function ElectionsSidebar() {
//     const [collapsed, setCollapsed] = useState(false);
//     const pathname = usePathname();
//     const { publicKey } = useWallet();

//     const menuItems = [
//         {
//             name: 'Browse Elections',
//             href: '/elections',
//             icon: ClipboardList,
//             badge: null,
//         },
//         {
//             name: 'My Votes',
//             href: '/elections/my-votes',
//             icon: CheckCircle2,
//             badge: null,
//         },
//         {
//             name: 'Registration',
//             href: '/elections/registration',
//             icon: UserCheck,
//             badge: null,
//         },
//     ];

//     return (
//         <aside
//             className={`fixed left-0 top-16 bottom-0 bg-gray-900 border-r border-gray-800 transition-all duration-300 z-40 ${collapsed ? 'w-20' : 'w-64'
//                 }`}
//         >
//             {/* Header - Removed per user request */}
//             <div className="p-6 border-b border-gray-800">
//                 <div className="flex items-center justify-center">
//                     <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center">
//                         <Vote className="w-6 h-6 text-white" />
//                     </div>
//                 </div>
//             </div>

//             {/* Navigation */}
//             <nav className="p-4 flex-1 overflow-y-auto">
//                 <div className="space-y-2">
//                     {/* Home Link */}
//                     <Link
//                         href="/"
//                         className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-400 hover:bg-gray-800 hover:text-white ${collapsed ? 'justify-center' : ''
//                             }`}
//                         title={collapsed ? 'Home' : ''}
//                     >
//                         <Home className="w-5 h-5 flex-shrink-0" />
//                         {!collapsed && <span className="flex-1">Home</span>}
//                     </Link>

//                     {/* Divider */}
//                     <div className="border-t border-gray-800 my-4" />

//                     {/* Menu Items */}
//                     {menuItems.map((item) => {
//                         const isActive = pathname === item.href;
//                         const Icon = item.icon;

//                         return (
//                             <Link
//                                 key={item.href}
//                                 href={item.href}
//                                 className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
//                                     ? 'bg-purple-500/10 text-purple-400'
//                                     : 'text-gray-400 hover:bg-gray-800 hover:text-white'
//                                     } ${collapsed ? 'justify-center' : ''}`}
//                                 title={collapsed ? item.name : ''}
//                             >
//                                 <Icon className="w-5 h-5 flex-shrink-0" />
//                                 {!collapsed && (
//                                     <>
//                                         <span className="flex-1">{item.name}</span>
//                                         {item.badge && (
//                                             <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
//                                                 {item.badge}
//                                             </span>
//                                         )}
//                                     </>
//                                 )}
//                             </Link>
//                         );
//                     })}
//                 </div>
//             </nav>

//             {/* Footer */}
//             <div className="p-4 border-t border-gray-800">
//                 {/* User Info */}
//                 {!collapsed && publicKey && (
//                     <div className="mb-4 p-3 bg-gray-800 rounded-lg">
//                         <div className="text-xs text-gray-400 mb-1">
//                             Connected Wallet
//                         </div>
//                         <div className="font-mono text-xs text-white truncate">
//                             {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-6)}
//                         </div>
//                     </div>
//                 )}

//                 {/* Collapse Button */}
//                 <button
//                     onClick={() => setCollapsed(!collapsed)}
//                     className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
//                     title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
//                 >
//                     {collapsed ? (
//                         <ChevronRight className="w-5 h-5" />
//                     ) : (
//                         <>
//                             <ChevronLeft className="w-5 h-5" />
//                             <span className="text-sm">Collapse</span>
//                         </>
//                     )}
//                 </button>
//             </div>
//         </aside>
//     );
// }
