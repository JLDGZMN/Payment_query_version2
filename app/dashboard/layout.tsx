import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardInactivityLogout } from "@/components/dashboard-inactivity-logout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider open={false}>
      <DashboardInactivityLogout />
      <AppSidebar />
      {children}
    </SidebarProvider>
  );
}
