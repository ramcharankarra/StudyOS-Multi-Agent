import { create } from "zustand"

interface UIState {
  isSidebarExpanded: boolean
  isMobileSidebarOpen: boolean
  isNotificationPanelOpen: boolean
  isSearchOpen: boolean
  
  toggleSidebar: () => void
  setSidebarExpanded: (expanded: boolean) => void
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleNotificationPanel: () => void
  setNotificationPanelOpen: (open: boolean) => void
  toggleSearch: () => void
  setSearchOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarExpanded: true,
  isMobileSidebarOpen: false,
  isNotificationPanelOpen: false,
  isSearchOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
  setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleNotificationPanel: () => set((state) => ({ isNotificationPanelOpen: !state.isNotificationPanelOpen })),
  setNotificationPanelOpen: (open) => set({ isNotificationPanelOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}))
