import { createContext, useContext } from "react";

interface StaffAuthContextType {
    staffAuth: boolean;
}

export const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

export const useStaffAuth = () => {
    const ctx = useContext(StaffAuthContext);
    if (!ctx) throw new Error("useStaffAuth error");
    return ctx;
};