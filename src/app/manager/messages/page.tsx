import { SharedMessagesPage } from "@/app/admin/messages/shared-messages-page";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerMessagesPage() {
  return (
    <SharedMessagesPage
      panelPath={`${managerPanelConfig.panelBase}/messages` as "/manager/messages"}
      panelTitle="Internal Messages"
    />
  );
}
