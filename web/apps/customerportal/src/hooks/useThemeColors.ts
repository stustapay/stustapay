import { usePublicConfig } from "./usePublicConfig";
import { useEffect } from "react";

export const useThemeColors = () => {
    const publicConfig = usePublicConfig();

    useEffect(() => {
        if (publicConfig.primary_color) {
            const color = publicConfig.primary_color;
            document.documentElement.style.setProperty("--primary-gradient", `linear-gradient(135deg, ${color}, ${color})`);
        }
        if (publicConfig.secondary_color) {
            const color = publicConfig.secondary_color;
            document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${color}, ${color})`);
        }
    }, [publicConfig.primary_color, publicConfig.secondary_color]);
};
