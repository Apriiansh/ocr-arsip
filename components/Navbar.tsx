"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown, ChevronRight, User, Settings, FileText, BarChart, Users, Home, Bell, LogOut } from "lucide-react"; // Archive icon is no longer needed
import { User as SupabaseUser } from '@supabase/supabase-js';

// Constants for roles and styling
const ROLES = {
  ADMIN: "Admin",
  KEPALA_BIDANG: "Kepala_Bidang",
  SEKRETARIS: "Sekretaris",
  PEGAWAI: "Pegawai",
  KEPALA_DINAS: "Kepala_Dinas", 
};

const ICON_SIZE = 18;

// Define types for refs and dropdowns
type DropdownType = 'user' | 'arsip' | 'pemindahan' | 'laporanKearsipan' | null; // Tambahkan laporanKearsipan
type SubmenuType = 'tambah' | 'daftar' | null;
type DropdownRefs = {
  [key in DropdownType & string]?: HTMLDivElement | null; // Ensure key is string
};

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // State management
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null); // For desktop hover submenus
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState<SubmenuType>(null); // For mobile accordion submenus
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState(ROLES.PEGAWAI);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs for handling click outside dropdown
  const dropdownRefs = useRef<DropdownRefs>({});

  // For handling dropdown closure delay
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const closeSubmenuTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const DROPDOWN_CLOSE_DELAY = 300;

  // Helper for determining active links
  const isActive = useCallback((href: string) => {
    return pathname.startsWith(href);
  }, [pathname]);

  // Fetch user data and notifications
  const fetchUserDataAndNotifications = useCallback(async (currentUser: SupabaseUser | null) => {
    if (!currentUser) {
      setUserRole(ROLES.PEGAWAI);
      setUnreadCount(0);
      return;
    }

    const userId = currentUser.id;
    try {
      // Fetch user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user role:", userError);
        setUserRole(ROLES.PEGAWAI);
      } else if (userData) {
        setUserRole(userData.role || ROLES.PEGAWAI);
      } else {
        console.warn(`No user data found for userId: ${userId}. Defaulting role.`);
        setUserRole(ROLES.PEGAWAI);
      }

      // Fetch unread notifications count
      const { count, error: countError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (countError) {
        console.error("Error fetching notification count:", countError);
        setUnreadCount(0);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error("Unexpected error in fetchUserDataAndNotifications:", error);
      setUserRole(ROLES.PEGAWAI);
      setUnreadCount(0);
    }
  }, [supabase]);

  // Check session and set up auth listener
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      await fetchUserDataAndNotifications(currentUser);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      await fetchUserDataAndNotifications(currentUser);

      if (!currentUser && pathname !== "/sign-in" && pathname !== "/sign-up") {
        router.push("/sign-in");
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserDataAndNotifications, pathname, router, supabase]);

  // Realtime listener for notifications count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime-notifications-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          console.log('Realtime notification change received!', payload);
          // Re-fetch the count when a change occurs
          const { count, error: countError } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

          if (!countError) setUnreadCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Reset active submenu when main dropdown closes
  useEffect(() => {
    if (openDropdown !== 'arsip') {
      setActiveSubmenu(null);
    }
  }, [openDropdown]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const currentRef = dropdownRefs.current[openDropdown];
        if (currentRef && !currentRef.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
      if (closeSubmenuTimeoutIdRef.current) {
        clearTimeout(closeSubmenuTimeoutIdRef.current);
      }
    };
  }, [closeTimeout]); // closeSubmenuTimeoutIdRef is a ref, not a dependency for this effect

  // Dropdown management functions
  const openDropdownMenu = (dropdownType: DropdownType) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    // Jika dropdown utama berubah, pastikan submenu yang aktif juga ditutup jika perlu
    if (openDropdown !== dropdownType && dropdownType !== 'arsip') {
        setActiveSubmenu(null);
        if(closeSubmenuTimeoutIdRef.current) {
            clearTimeout(closeSubmenuTimeoutIdRef.current);
            closeSubmenuTimeoutIdRef.current = null;
        }
    }

    // Only open user dropdown if user is logged in
    if (dropdownType === 'user' && !user) {
      return;
    }

    setOpenDropdown(openDropdown === dropdownType ? null : dropdownType);
  };

  const closeDropdownMenuWithDelay = () => {
    if (closeTimeout) clearTimeout(closeTimeout);

    const timeoutId = setTimeout(() => {
      setOpenDropdown(null);
    }, DROPDOWN_CLOSE_DELAY);

    setCloseTimeout(timeoutId);
  };

  const openSubmenu = (submenuType: SubmenuType) => {
    if (closeSubmenuTimeoutIdRef.current) {
      clearTimeout(closeSubmenuTimeoutIdRef.current);
      closeSubmenuTimeoutIdRef.current = null;
    }
    // Pastikan dropdown utama tetap terbuka
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setActiveSubmenu(submenuType);
  };

  const closeActiveSubmenuWithDelay = () => {
    if (closeSubmenuTimeoutIdRef.current) {
      clearTimeout(closeSubmenuTimeoutIdRef.current);
    }
    closeSubmenuTimeoutIdRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      closeSubmenuTimeoutIdRef.current = null; // Clear ref after execution
    }, DROPDOWN_CLOSE_DELAY);
  };

  const closeAllMenusAndDropdowns = () => {
    setOpenDropdown(null);
    setActiveSubmenu(null);
    setMobileSubmenuOpen(null);
    setIsMobileMenuOpen(false);
  };

  // Auth functions
  const handleLogout = async () => {
    try {
      closeAllMenusAndDropdowns();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error during sign out:", error);
      } else {
        sessionStorage.removeItem('loginNotificationShown'); // Hapus flag saat logout berhasil
      }
    } catch (e) {
      console.error("Unexpected error during logout:", e);
    }
  };

  // CSS classes
  const linkClasses = {
    base: "flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-primary-foreground",
    active: "font-semibold bg-black/15", // text-primary-foreground inherited from base, bg adjusted for primary navbar
    inactive: "hover:bg-black/10", // text-primary-foreground inherited from base, hover bg adjusted
  };

  const dropdownClasses = {
    // For buttons on the main navbar (bg-primary) that trigger dropdowns
    button: `${linkClasses.base} ${linkClasses.inactive}`, // Base styling + inactive hover
    activeButton: `${linkClasses.base} ${linkClasses.active} shadow`, // Base styling + active state + shadow for emphasis
    
    // For the dropdown menu itself and its items (these are on bg-card)
    menu: "absolute mt-0 -mt-1 pt-3 bg-card border border-border rounded-md shadow-lg z-10 w-52 py-1 text-card-foreground",
    item: "block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors rounded",
    itemWithSubmenu: "flex w-full justify-between items-center text-left px-3 py-2 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors rounded",
    activeItem: "block w-full text-left px-3 py-2 text-sm bg-primary text-primary-foreground font-semibold transition-colors rounded",
    submenu: "absolute left-full top-0 -mt-[1px] ml-1 bg-card border border-border rounded-md shadow-lg z-20 w-48 py-1 overflow-hidden text-card-foreground",
  };


  const mobileClasses = {
    menu: "md:hidden bg-background border-t",
    item: "flex items-center gap-2 px-4 py-2 rounded-md transition-colors w-full text-left my-1",
    active: "text-primary font-medium bg-primary/10",
    inactive: "text-foreground hover:text-primary hover:bg-primary/5",
    section: "p-3 space-y-2",
    sectionTitle: "px-4 py-2 text-sm font-medium text-muted-foreground border-t",
  };

  // Role-based menu rendering
  const renderRoleBasedMenuItems = () => {
    // Helper for link classes
    const getLinkClass = (href: string) =>
      `${linkClasses.base} ${isActive(href) ? linkClasses.active : linkClasses.inactive}`;

    // Helper for dropdown button classes
    const getDropdownButtonClass = (dropdownType: DropdownType) =>
      `${openDropdown === dropdownType ? dropdownClasses.activeButton : dropdownClasses.button}`;

    // Helper for dropdown item classes
    const getDropdownItemClass = (href: string) =>
      `${isActive(href) ? dropdownClasses.activeItem : dropdownClasses.item}`;

    switch (userRole) {
      case ROLES.ADMIN:
        return (
          <>
          
            <Link href="/admin" className={getLinkClass('/admin')}>
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <Link href="/admin/manage-user" className={getLinkClass('/admin/manage-user')}>
              <Users size={ICON_SIZE} />
              <span>Kelola Pengguna</span>
            </Link>

          </>
        );

      case ROLES.KEPALA_BIDANG:
        return (
          <>
            <Link href="/unit-pengolah/verifikasi-arsip" className={getLinkClass('/unit-pengolah/verifikasi-arsip')}>
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Arsip</span>
            </Link>

            <Link href="/unit-pengolah" className={getLinkClass('/unit-pengolah')}>
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <Link href="/arsip/pemindahan/verifikasi/kepala-bidang" className={getLinkClass('/arsip/pemindahan/verifikasi/kepala-bidang')}>
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Pemindahan</span>
            </Link>

          </>
        );

      case ROLES.KEPALA_DINAS:
        return (
          <>
            <Link href="/kepala-dinas" className={getLinkClass('/kepala-dinas')}>
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>
            <div
              className="relative"
              onMouseEnter={() => openDropdownMenu('laporanKearsipan')}
              onMouseLeave={closeDropdownMenuWithDelay}
              ref={(el) => { dropdownRefs.current['laporanKearsipan'] = el; }}
            >
              <button className={getDropdownButtonClass('laporanKearsipan')}>
                <BarChart size={ICON_SIZE} />
                <span>Laporan Kearsipan</span>
                <ChevronDown size={16} className={`ml-1 transition-transform ${openDropdown === 'laporanKearsipan' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'laporanKearsipan' && (
                <div className={dropdownClasses.menu}>
                  <Link href="/kepala-dinas/laporan/arsip-aktif" onClick={closeAllMenusAndDropdowns} className={getDropdownItemClass('/kepala-dinas/laporan/arsip-aktif')}>
                    <FileText size={ICON_SIZE - 2} className="mr-2 inline-block" /> Laporan Arsip Aktif
                  </Link>
                  <Link href="/kepala-dinas/laporan/arsip-inaktif" onClick={closeAllMenusAndDropdowns} className={getDropdownItemClass('/kepala-dinas/laporan/arsip-inaktif')}>
                    <FileText size={ICON_SIZE - 2} className="mr-2 inline-block" /> Laporan Arsip Inaktif
                  </Link>
                </div>
              )}
            </div>
          </>
        );



      case ROLES.SEKRETARIS:
        return (
          <>
          
            <Link href="/unit-kearsipan/verifikasi-arsip" className={getLinkClass('/unit-kearsipan/verifikasi-arsip')}>
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Arsip</span>
            </Link>

            <Link href="/unit-kearsipan" className={getLinkClass('/unit-kearsipan')}>
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <Link href="/arsip/pemindahan/verifikasi/sekretaris" className={getLinkClass('/arsip/pemindahan/verifikasi/sekretaris')}>
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Pemindahan</span>
            </Link>

          </>
        );

      // Bagian untuk ROLES.PEGAWAI di renderRoleBasedMenuItems() - Desktop Menu
      // Perbaikan untuk Desktop Menu - bagian ROLES.PEGAWAI
      case ROLES.PEGAWAI:
      default:
        return (
          <>
            <div
              className="relative"
              onMouseEnter={() => {
                if (closeTimeout) {
                  clearTimeout(closeTimeout);
                  setCloseTimeout(null);
                }
                setOpenDropdown('arsip');
              }}
              onMouseLeave={closeDropdownMenuWithDelay}
              ref={(el) => { dropdownRefs.current['arsip'] = el; }}
            >
              <button className={getDropdownButtonClass('arsip')}>
                <FileText size={ICON_SIZE} />
                <span>Arsip</span>
                <ChevronDown size={16} className={`ml-1 transition-transform ${openDropdown === 'arsip' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'arsip' && (
                <div className={dropdownClasses.menu}>
                  <Link
                    href="/arsip/arsip-aktif"
                    onClick={closeAllMenusAndDropdowns}
                    className={getDropdownItemClass('/arsip/arsip-aktif')}
                  >
                    Tambah Arsip
                  </Link>

                  {/* Daftar Arsip Submenu - tetap ada */}
                  <div className="relative"
                    onMouseEnter={() => openSubmenu('daftar')}
                    onMouseLeave={closeActiveSubmenuWithDelay}
                  >
                    <button className={dropdownClasses.itemWithSubmenu}>
                      <span>Daftar Arsip</span>
                      <ChevronRight size={14} />
                    </button>
                    {activeSubmenu === 'daftar' && (
                      <div
                        className={dropdownClasses.submenu}
                        onMouseEnter={() => {
                          if (closeSubmenuTimeoutIdRef.current) {
                            clearTimeout(closeSubmenuTimeoutIdRef.current);
                            closeSubmenuTimeoutIdRef.current = null;
                          }
                          if (closeTimeout) {
                            clearTimeout(closeTimeout);
                            setCloseTimeout(null);
                          }
                        }}
                        onMouseLeave={closeActiveSubmenuWithDelay}
                      >
                        <Link href="/arsip/arsip-aktif/daftar-aktif" onClick={closeAllMenusAndDropdowns} className={getDropdownItemClass('/arsip/arsip-aktif/daftar-aktif')}>
                          Arsip Aktif
                        </Link>
                        <Link href="/arsip/arsip-inaktif/daftar-inaktif" onClick={closeAllMenusAndDropdowns} className={getDropdownItemClass('/arsip/arsip-inaktif/daftar-inaktif')}>
                          Arsip Inaktif
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link href="/arsip/retensi" onClick={closeAllMenusAndDropdowns} className={getDropdownItemClass('/arsip/retensi')}>
                    Retensi Arsip
                  </Link>

                </div>
              )}
            </div>

            <Link href="/user" className={getLinkClass('/user')}>
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <div
              className="relative"
              onMouseEnter={() => {
                if (closeTimeout) {
                  clearTimeout(closeTimeout);
                  setCloseTimeout(null);
                }
                setOpenDropdown('pemindahan');
              }}
              onMouseLeave={closeDropdownMenuWithDelay}
              ref={(el) => { dropdownRefs.current['pemindahan'] = el; }}
            >
              <button className={getDropdownButtonClass('pemindahan')}>
                <FileText size={ICON_SIZE} />
                <span>Pemindahan Arsip</span>
                <ChevronDown size={16} className={`ml-1 transition-transform ${openDropdown === 'pemindahan' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'pemindahan' && (
                <div className={dropdownClasses.menu}>
                  <Link
                    href="/arsip/pemindahan/"
                    onClick={closeAllMenusAndDropdowns}
                    className={getDropdownItemClass('/arsip/pemindahan')}
                  >
                    Mulai Pemindahan
                  </Link>
                  <Link
                    href="/arsip/pemindahan/riwayat"
                    onClick={closeAllMenusAndDropdowns}
                    className={getDropdownItemClass('/arsip/pemindahan/riwayat')}
                  >
                    Riwayat
                  </Link>
                </div>
              )}
            </div>
          </>
        );

    }
  };

  // Mobile menu items rendering
  const renderMobileMenuItems = () => {
    // Helper for mobile menu item classes
    const getMobileItemClass = (href: string) =>
      `${mobileClasses.item} ${isActive(href) ? mobileClasses.active : mobileClasses.inactive}`;

    // Common mobile items for all roles
    const commonMobileItems = (
      <Link
        href="/search"
        onClick={closeAllMenusAndDropdowns}
        className={getMobileItemClass('/search')}
      >
        <Home size={ICON_SIZE} />
        <span>Search</span>
      </Link>
    );

    switch (userRole) {
      case ROLES.ADMIN:
        return (
          <>

            <Link
              href="/admin"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/admin')}
            >
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <Link
              href="/admin/manage-user"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/admin/manage-user')}
            >
              <Users size={ICON_SIZE} />
              <span>Kelola Pengguna</span>
            </Link>

            {commonMobileItems}
          </>
        );

      case ROLES.KEPALA_BIDANG:
        return (
          <>
            

            <Link
              href="/unit-pengolah/verifikasi-arsip"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/unit-pengolah/verifikasi-arsip')}
            >
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Arsip</span>
            </Link>

            <Link
              href="/unit-pengolah"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/unit-pengolah')}
            >
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <Link
              href="/arsip/pemindahan/verifikasi/kepala-bidang"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/arsip/pemindahan/verifikasi/kepala-bidang')}
            >
              <BarChart size={ICON_SIZE} />
              <span>Verifikasi Pemindahan</span>
            </Link>

            {commonMobileItems}
          </>
        );

      case ROLES.SEKRETARIS:
        return (
          <>
            

            <Link
              href="/unit-kearsipan/verifikasi-arsip"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/unit-kearsipan/verifikasi-arsip')}
            >
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Arsip</span>
            </Link>

            <Link
              href="/unit-kearsipan"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/unit-kearsipan')}
            >
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <Link
              href="/arsip/pemindahan/verifikasi/sekretaris"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/arsip/pemindahan/verifikasi/sekretaris')}
            >
              <FileText size={ICON_SIZE} />
              <span>Verifikasi Pemindahan</span>
            </Link>

            {commonMobileItems}
          </>
        );

      case ROLES.PEGAWAI:
      default:
        return (
          <>
            {/* Arsip Mobile Menu */}
            <button
              onClick={() => {
                if (openDropdown === 'arsip') {
                  setOpenDropdown(null); setMobileSubmenuOpen(null);
                } else {
                  setOpenDropdown('arsip'); setMobileSubmenuOpen(null);
                }
              }}
              className={`${mobileClasses.item} ${openDropdown === 'arsip' ? mobileClasses.active : mobileClasses.inactive} justify-between w-full`}
            >
              <span className="flex items-center gap-2">
                <FileText size={ICON_SIZE} />
                <span>Arsip</span>
              </span>
              <ChevronDown size={16} className={`transition-transform ${openDropdown === 'arsip' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'arsip' && (
              <div className="pl-6 space-y-1">
                {/* Tambah Arsip - langsung ke link tanpa submenu */}
                <Link
                  href="/arsip/arsip-aktif"
                  onClick={closeAllMenusAndDropdowns}
                  className={getMobileItemClass('/arsip/arsip-aktif')}
                >
                  Tambah Arsip
                </Link>

                {/* Daftar Arsip Mobile Submenu - tetap ada */}
                <button
                  onClick={() => setMobileSubmenuOpen(prev => prev === 'daftar' ? null : 'daftar')}
                  className={`${mobileClasses.item} ${mobileSubmenuOpen === 'daftar' ? mobileClasses.active : mobileClasses.inactive} justify-between w-full`}
                >
                  <span>Daftar Arsip</span>
                  <ChevronDown size={16} className={`transition-transform ${mobileSubmenuOpen === 'daftar' ? 'rotate-180' : ''}`} />
                </button>
                {mobileSubmenuOpen === 'daftar' && (
                  <div className="pl-6 space-y-1">
                    <Link href="/arsip/arsip-aktif/daftar-aktif" onClick={closeAllMenusAndDropdowns} className={getMobileItemClass('/arsip/arsip-aktif/daftar-aktif')}>Arsip Aktif</Link>
                    <Link href="/arsip/arsip-inaktif/daftar-inaktif" onClick={closeAllMenusAndDropdowns} className={getMobileItemClass('/arsip/arsip-inaktif/daftar-inaktif')}>Arsip Inaktif</Link>
                  </div>
                )}

                {/* Retensi Arsip */}
                <Link
                  href="/arsip/retensi"
                  onClick={closeAllMenusAndDropdowns}
                  className={getMobileItemClass('/arsip/retensi')}
                >
                  Retensi Arsip
                </Link>
              </div>
            )}

            <Link
              href="/user"
              onClick={closeAllMenusAndDropdowns}
              className={getMobileItemClass('/user')}
            >
              <Home size={ICON_SIZE} />
              <span>Home</span>
            </Link>

            <button
              onClick={() => openDropdownMenu('pemindahan')}
              className={`${mobileClasses.item} ${openDropdown === 'pemindahan' ? mobileClasses.active : mobileClasses.inactive} justify-between`}
            >
              <span className="flex items-center gap-2">
                <FileText size={ICON_SIZE} />
                <span>Pemindahan Arsip</span>
              </span>
              <ChevronDown size={16} className={`transition-transform ${openDropdown === 'pemindahan' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'pemindahan' && (
              <div className="pl-6 space-y-1">
                <Link
                  href="/arsip/pemindahan/"
                  onClick={closeAllMenusAndDropdowns}
                  className={getMobileItemClass('/arsip/pemindahan')}
                >
                  Mulai Pemindahan
                </Link>
                <Link
                  href="/arsip/pemindahan/riwayat"
                  onClick={closeAllMenusAndDropdowns}
                  className={getMobileItemClass('/arsip/pemindahan/riwayat')}
                >
                  Riwayat
                </Link>
              </div>
            )}

            {commonMobileItems}
          </>
    );
    }
  };

  // Get user display name
  const displayName = user?.user_metadata?.display_name || user?.email;

  return (
    <nav className="bg-primary text-primary-foreground border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center px-4 h-16">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-semibold text-primary-foreground hover:text-primary-foreground/80 transition-colors"
        >
          <img 
            src="/logosumsel.png" 
            alt="CrChive Logo" 
            className="h-10 w-8"
          />
          CrChive
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex flex-grow justify-center space-x-1 items-center">
          {renderRoleBasedMenuItems()}
        </div>

        {/* Notifications and User Profile (Desktop) */}
        <div className="hidden md:flex items-center space-x-2">
          {user && (
            <Link
              href="/notifikasi"
              className={`${linkClasses.base} ${isActive('/notifikasi') ? linkClasses.active : linkClasses.inactive} relative`}
            >
              <Bell size={ICON_SIZE} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-foreground text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          <div
            className="relative"
            onMouseEnter={() => openDropdownMenu('user')}
            onMouseLeave={closeDropdownMenuWithDelay}
            ref={(el) => { dropdownRefs.current['user'] = el; }}
          >
            {user ? (
              <>
                <button className={openDropdown === 'user' ? dropdownClasses.activeButton : dropdownClasses.button}>
                  <User size={ICON_SIZE} />
                  <span className="max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown size={16} className={`transition-transform ${openDropdown === 'user' ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === 'user' && (
                  <div className={dropdownClasses.menu + ' bg-card border border-border text-card-foreground'}>
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-1">
                      {userRole}
                    </div>
                    <Link
                      href="/settings"
                      onClick={closeAllMenusAndDropdowns}
                      className={isActive('/settings') ? dropdownClasses.activeItem : dropdownClasses.item}
                    >
                      <div className="flex items-center gap-2">
                        <Settings size={16} />
                        <span>Pengaturan</span>
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className={dropdownClasses.item}
                    >
                      <div className="flex items-center gap-2">
                        <LogOut size={16} />
                        <span>Logout</span>
                      </div>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex space-x-1">
                <Link
                  href="/sign-in"
                  className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-primary-foreground hover:bg-primary/10"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          className="md:hidden flex items-center px-2 py-1 rounded-md text-primary-foreground hover:bg-primary/10"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="p-3 space-y-2">
            {renderMobileMenuItems()}
            {user && (
              <Link
                href="/notifikasi"
                onClick={closeAllMenusAndDropdowns}
                className={`${mobileClasses.item} ${isActive('/notifikasi') ? mobileClasses.active : mobileClasses.inactive}`}
              >
                <Bell size={ICON_SIZE} />
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <>
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground border-t">
                  <div className="font-medium">{displayName}</div>
                  <div className="text-xs">{userRole}</div>
                </div>
                <Link
                  href="/settings"
                  onClick={closeAllMenusAndDropdowns}
                  className={`${mobileClasses.item} ${isActive('/settings') ? mobileClasses.active : mobileClasses.inactive}`}
                >
                  <Settings size={ICON_SIZE} />
                  <span>Pengaturan</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className={`${mobileClasses.item} ${mobileClasses.inactive}`}
                >
                  <LogOut size={ICON_SIZE} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Link
                  href="/sign-in"
                  onClick={closeAllMenusAndDropdowns}
                  className="w-full px-4 py-2 text-center rounded-md border text-foreground hover:bg-primary/5"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={closeAllMenusAndDropdowns}
                  className="w-full px-4 py-2 text-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}