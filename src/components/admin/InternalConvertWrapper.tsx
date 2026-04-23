"use client"

import { useRouter } from "next/navigation";
import InternalConvertModal from "./InternalConvertModal";

interface Props {
  orgId: string;
  initialStatus: boolean;
}

export default function InternalConvertWrapper({ orgId, initialStatus }: Props) {
  const router = useRouter();

  
  const handleClose = () => {
    
    router.push("/admin/customers");
  };

  return (
    <InternalConvertModal 
      orgId={orgId} 
      initialStatus={initialStatus} 
      onClose={handleClose} 
    />
  );
}
