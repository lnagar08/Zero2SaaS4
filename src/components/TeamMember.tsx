export default function TeamMember() {
    return(
        <>
        <div className="flex items-center justify-between gap-6 py-6 border-t border-neutral-200">
          <div className="flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-full bg-[#E6EAFF] text-[#4F46E5] flex items-center justify-center text-xl font-medium tracking-tight"
            >
              EW
            </div>
            <div>
              <div className="text-[20px] font-medium leading-snug">Erik Weingold</div>
              <div className="text-[17px] text-[#717A8C] mt-1">erik@ppmlawyers.com</div>
            </div>
          </div>
          <span
            className="bg-[#F3F4FB] text-[#4F46E5] text-[15px] font-medium px-5 py-2.5 rounded-full"
          >
            Owner
          </span>
        </div>

        <div className="flex items-center justify-between gap-6 py-6 border-t border-neutral-200">
          <div className="flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-full bg-[#E1F3EC] text-[#006F4D] flex items-center justify-center text-xl font-medium tracking-tight"
            >
              MW
            </div>
            <div>
              <div className="text-[20px] font-medium leading-snug">Michael Wheeler</div>
              <div className="text-[17px] text-[#717A8C] mt-1">michael@ppmlawyers.com</div>
            </div>
          </div>
          <span
            className="bg-[#E1F3EC] text-[#006F4D] text-[15px] font-medium px-5 py-2.5 rounded-full"
          >
            Attorney
          </span>
        </div>

        <div className="flex items-center justify-between gap-6 py-6 border-t border-neutral-200">
          <div className="flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-full bg-[#DCE4FA] text-[#1E3A8A] flex items-center justify-center text-xl font-medium tracking-tight"
            >
              GD
            </div>
            <div>
              <div className="text-[20px] font-medium leading-snug">Ginevra DiRocco</div>
              <div className="text-[17px] text-[#717A8C] mt-1">ginevra@ppmlawyers.com</div>
            </div>
          </div>
          <span
            className="bg-[#E4F0FB] text-[#0279B9] text-[15px] font-medium px-5 py-2.5 rounded-full"
          >
            Staff
          </span>
        </div>
        </>
    )
}