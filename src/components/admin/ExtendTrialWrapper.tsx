"use client"
import { useRouter } from "next/navigation";
import ExtendTrialModal from "./ExtendTrialModal"; 

export default function ExtendTrialWrapper({ 
  orgId, 
  currentTrialEnd 
}: { 
  orgId: string; 
  currentTrialEnd: Date | null | undefined 
}) {
  const router = useRouter();

  const handleClose = () => {
    // close the modal and refresh the page to show updated trial end date
    router.push("/admin/customers"); 
  };

  return <ExtendTrialModal 
      orgId={orgId} 
      currentTrialEnd={currentTrialEnd} 
      onClose={handleClose} 
    />;
}
